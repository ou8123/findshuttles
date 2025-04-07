import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Using shared authOptions
import slugify from 'slugify';
import { Prisma } from '@prisma/client'; // Import Prisma
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // Import type

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Preprocess additional instructions to clean URLs, format city/hotel lists, and neutralize tone
 *
 * @param input The raw additional instructions from the editor
 * @returns Cleaned and structured content ready for LLM processing
 */
function preprocessAdditionalInstructions(input: string): string {
  if (!input || input.trim() === '') return '';

  // Normalize line endings
  let processed = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove external URLs
  processed = processed.replace(/https?:\/\/\S+/g, '');
  processed = processed.replace(/Read more about.*$/gim, '');
  processed = processed.replace(/visit (the )?official page.*$/gim, '');

  // Try to extract city lists
  const cityRegexes: RegExp[] = [
    /(?:between|connecting)\s+([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i,
    /cities\s*(?:include|:)\s*([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i,
    /(?:provides service to|serves)\s+([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i
  ];

  let extractedCities: string[] = [];

  // Try to extract cities using different patterns
  for (const regex of cityRegexes) {
    const match = processed.match(regex);
    if (match && match[1]) {
      // Split the matched text into city names
      const cities = match[1]
        .replace(/\s+and\s+|\s*&\s*/g, ', ') // Replace "and" and "&" with commas
        .split(/\s*,\s*/)                    // Split by commas
        .map(city => city.trim())            // Trim whitespace
        .filter(city => city.length > 1);    // Filter out any empty or single-character entries

      if (cities.length >= 2) {
        extractedCities = cities;
        break;
      }
    }
  }

  // Try to extract hotel mentions
  const hotelMatches = processed.match(/(?:hotels?|accommodations?|lodging)(?:\s+include|\s*:)?\s+([\w\s,'&]+(?:Inn|Hotel|Lodge|Motel|Suites|Resort|Plaza|&|and)[\w\s,'&]+)/gi);
  const extractedHotels: string[] = [];

  if (hotelMatches && hotelMatches.length > 0) {
    const hotelText = hotelMatches.join(' ');

    // Extract hotel names - look for patterns like capitalized words followed by Hotel, Inn, etc.
    const hotelNameRegex = /([A-Z][\w\s,'&]+(?:Inn|Hotel|Lodge|Motel|Suites|Resort|Plaza))/g;
    let hotelMatch: RegExpExecArray | null;
    while ((hotelMatch = hotelNameRegex.exec(hotelText)) !== null) {
      if (hotelMatch[1] && hotelMatch[1].trim().length > 5) { // Ensure it's a substantial hotel name
        extractedHotels.push(hotelMatch[1].trim());
      }
    }
  }

  // Neutralize first-person language
  const firstPersonReplacements = [
    { pattern: /\b(?:we|our)\s+(?:offer|provide|have)\b/gi, replacement: 'the service offers' },
    { pattern: /\b(?:you|your)\s+(?:can|will)\s+(?:enjoy|experience|receive)\b/gi, replacement: 'travelers can enjoy' },
    { pattern: /\b(?:we|our)\s+(?:staff|team|drivers)\b/gi, replacement: 'the staff' },
    { pattern: /\b(?:you|your)\s+(?:journey|trip|travel)\b/gi, replacement: 'the journey' },
    { pattern: /\b(?:we|our)\s+vehicles\b/gi, replacement: 'the vehicles' },
    { pattern: /\byou(?:'ll| will)\b/gi, replacement: 'travelers will' },
    { pattern: /\byour\b/gi, replacement: 'the' },
    { pattern: /\bwe\b/gi, replacement: 'the service' },
    { pattern: /\bour\b/gi, replacement: 'the' },
    { pattern: /\byou\b/gi, replacement: 'travelers' }
  ];

  // Apply all first-person replacements
  for (const { pattern, replacement } of firstPersonReplacements) {
    processed = processed.replace(pattern, replacement);
  }

  // Remove promotional superlatives
  const promotionalPhrases = [
    /\b(?:best|top|premier|luxury|exclusive|exceptional|outstanding|unparalleled)\b/gi,
    /\b(?:amazing|incredible|extraordinary|spectacular|remarkable)\b/gi
  ];

  for (const pattern of promotionalPhrases) {
    processed = processed.replace(pattern, '');
  }

  // Remove sentences mentioning taxes/fees/charges
  processed = processed.replace(/^.*(?:taxes|fees|handling charges|includes all).*$/gim, '');

  // City and Hotel lists are no longer appended here, as they are handled by separate UI components.
  // The extraction logic above might be useful elsewhere if needed later.

  return processed.trim();
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Add a top-level try-catch to ensure *any* error returns JSON
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'Content generation service is not properly configured' },
        { status: 503 }
      );
    }

    // Parse the request body with specific error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError: any) { // Catch specific parse error
      console.error('Failed to parse request body:', parseError.message);
      return NextResponse.json(
        { error: `Invalid request format: ${parseError.message}` },
        { status: 400 }
      );
    }

    // Destructure required fields and new flags from request body
    const {
      departureCityId,
      destinationCityId,
      isAirportPickup = false, // Default to false if not provided
      isAirportDropoff = false, // Default to false if not provided
      isCityToCity = true, // Default to true if others are false
      isPrivateDriver = false, // New flag
      isSightseeingShuttle = false, // New flag
      additionalInstructions = ''
    } = requestData;

    // Validate required fields
    if (!departureCityId || !destinationCityId) {
      return NextResponse.json(
        { error: 'Missing required fields: departureCityId and destinationCityId' },
        { status: 400 }
      );
    }

    // Fetch city information from database using include
    const departureCity = await prisma.city.findUnique({
      where: { id: departureCityId },
      include: { country: true } // Include country for name
    });

    const destinationCity = await prisma.city.findUnique({
      where: { id: destinationCityId },
      include: { country: true } // Include country for name
    });

    if (!departureCity || !destinationCity) {
      return NextResponse.json(
        { error: 'Could not find departure or destination city' },
        { status: 404 }
      );
    }

    // Extract needed information correctly from the included relation
    const departureCityName = departureCity.name;
    const destinationCityName = destinationCity.name;
    // Ensure country object exists before accessing name
    const destinationCountryName = destinationCity.country?.name;

    // Add a check in case country wasn't included properly
    if (!destinationCountryName) {
       console.error("Could not retrieve destination country name for city ID:", destinationCityId);
       return NextResponse.json({ error: 'Internal server error: Could not determine destination country.' }, { status: 500 });
    }


    // Debug log
    console.log(`Generating content for: ${departureCityName} to ${destinationCityName}, ${destinationCountryName}`);
    console.log(`Route Type Flags: Pickup=${isAirportPickup}, Dropoff=${isAirportDropoff}, City=${isCityToCity}, Private=${isPrivateDriver}, Sightseeing=${isSightseeingShuttle}`); // Log new flags
    console.log(`Additional instructions: ${additionalInstructions.substring(0, 100)}${additionalInstructions.length > 100 ? '...' : ''}`);

    // Preprocess the additional instructions (neutralize tone, remove URLs, remove tax mentions)
    const processedInstructions = preprocessAdditionalInstructions(additionalInstructions);

    // --- Prepare prompt for OpenAI (New Prompt Structure) ---

    // Determine routeType string based on boolean flags
    let routeTypeString = 'cityToCity'; // Default
    if (isAirportPickup) routeTypeString = 'airportPickup';
    else if (isAirportDropoff) routeTypeString = 'airportDropoff';
    else if (isPrivateDriver) routeTypeString = 'privateDrivingService';
    else if (isSightseeingShuttle) routeTypeString = 'sightseeingShuttle';

    // --- NEW: Conditional logic for custom prompt phrasing ---
    let routeDescriptionIntro = '';
    const sameCity = departureCityName === destinationCityName; // Compare names

    if (routeTypeString === 'privateDrivingService') {
      routeDescriptionIntro = sameCity
        ? `You are an expert travel writer. Write a professional, SEO-friendly description for a private driving service based in ${departureCityName}. This is a customizable, full-day service that may include scenic drives, stops at local attractions, and flexible transfers.`
        : `You are an expert travel writer. Write a professional, SEO-friendly description for a private driving service from ${departureCityName} to ${destinationCityName}.`;
    } else if (routeTypeString === 'sightseeingShuttle') {
      routeDescriptionIntro = sameCity
        ? `You are an expert travel writer. Write a professional, SEO-friendly description for a sightseeing shuttle tour starting and ending in ${departureCityName}. The trip includes roundtrip transport, scenic routes, and stops at notable local attractions.`
        : `You are an expert travel writer. Write a professional, SEO-friendly description for a sightseeing shuttle from ${departureCityName} to ${destinationCityName}.`;
    } else if (routeTypeString === 'airportPickup') {
        routeDescriptionIntro = `You are an expert travel writer. Write a professional, SEO-friendly description for an airport pickup shuttle service from ${departureCityName} airport to ${destinationCityName}. Use a welcoming tone (e.g., "Welcome to ${destinationCountryName}", "Your ${destinationCountryName} journey begins..."). Mention a smooth pickup from the airport and highlight the destination city.`;
    } else if (routeTypeString === 'airportDropoff') {
        routeDescriptionIntro = `You are an expert travel writer. Write a professional, SEO-friendly description for an airport dropoff shuttle service from ${departureCityName} to ${destinationCityName} airport. Begin by stating the route ends at the airport. Then suggest possible attractions or activities near the airport city for travelers with time before their flight. Avoid farewell phrases.`;
    } else { // Default to cityToCity
      routeDescriptionIntro = `You are an expert travel writer. Write a professional, SEO-friendly description for a shuttle route from ${departureCityName} to ${destinationCityName}. Use flexible language like "Continue your ${destinationCountryName} adventure" or "Enjoy the scenic ride..." Highlight both departure and destination cities briefly, with a focus on the destination.`;
    }
    // --- End NEW conditional logic ---

    const prompt = `
You are an expert travel writer helping improve SEO for a shuttle booking site. Write an SEO-optimized, professional, and human-sounding description for a shuttle route.

Follow these instructions exactly:
- Output valid JSON with three fields: "seoDescription", "metaTitle", and "metaDescription".
- The "seoDescription" should be **2 to 3 natural paragraphs max**, not more. Each paragraph should have multiple sentences and sound like it was written by a person. Avoid overly short or broken-up paragraphs.
- Do not include a title or heading inside the "seoDescription".
- If "additionalComments" is provided, **incorporate the exact content naturally into the description**.
- Do not mention specific vehicles, drivers, or operator names unless included in "additionalComments".
- Do not use vague promotional phrases like "convenient like never before" or "premier platform".

Customize the tone and structure based on the route type below:

---

**If routeType is "airport pickup"**:
- Use a warm, welcoming tone like: “Welcome to [country]!” or “Start your adventure in [destination city]…”
- Avoid repeating the same phrase across different listings.
- Introduce [destination city] in the second paragraph with 2–3 named attractions (e.g., beaches, national parks, volcanoes, waterfalls, adventure parks).
- Mention 1–2 activities travelers can enjoy (e.g., surfing, kayaking, birdwatching, estuary tours).

---

**If routeType is "airport dropoff"**:
- Mention airport drop-off first: “This shuttle takes you to [airport name or destination city] for your flight.”
- In the second paragraph, mention optional things to do in or around [destination city] if travelers have a layover or extra time.
- Avoid heavy farewell or departure tone—assume they might not be leaving the country yet.

---

**If routeType is "city to city"**:
- Write a natural-sounding paragraph about traveling from [departure city] to [destination city].
- Use varied language like “Enjoy the scenic ride,” “Your next destination,” or “A smooth journey through the region.”
- In the second paragraph, introduce [destination city] with 2–3 specific attractions and 1–2 activities people can enjoy.

---

**If routeType is "private driving service"**:
- Describe the service as a **versatile option for both full-day tours and point-to-point transfers**.
- Emphasize flexibility and customizability (e.g., ability to make stops, visit sites).
- Mention the general region or cities served if applicable.
- In the second paragraph, highlight 2–3 attractions they might stop at (volcanoes, waterfalls, beaches, towns, etc.), and 1–2 activities.

---

**If routeType is "sightseeing shuttle"**:
- Focus on the sightseeing loop experience, starting and ending in the same location.
- Avoid saying “from X to X.”
- Describe notable sites along the way and include examples of photo ops, nature stops, or towns.
- Mention 2–3 places or attractions and 1–2 possible activities like hiking, visiting a park, or swimming.

---

Include only relevant info based on the route type. Here’s the data you’ll receive:

{
  departureCity: string,
  destinationCity: string,
  countryName: string,
  routeType: one of ["airport pickup", "airport dropoff", "city to city", "private driving service", "sightseeing shuttle"],
  travelTime: string,
  otherStops: string[], // may be empty
  additionalComments: string // may be empty
}

Output must follow this structure exactly:
{
  "seoDescription": "LONGER PARAGRAPH TEXT HERE",
  "metaTitle": "Concise and descriptive title for meta tag (max ~60 characters)",
  "metaDescription": "1-sentence summary for meta description tag (max ~155 characters)"
}
`.trim();

    // Construct the input JSON for the AI (User message)
    const aiInputJson = {
        departureCity: departureCityName,
        destinationCity: destinationCityName,
        country: destinationCountryName,
        routeType: routeTypeString, // Keep routeType for context if needed by AI, though prompt handles phrasing
        additionalInstructions: processedInstructions || null // Send null if empty
    };

    // Construct the messages array for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: prompt // Use the new prompt variable
      },
      {
        role: "user",
        // Send the structured JSON input as the user message content
        content: JSON.stringify(aiInputJson, null, 2)
      }
    ];
    // --- End Prompt Preparation ---


    // Enhanced debugging logs
    console.log("---------- CONTENT GENERATION REQUEST ----------");
    console.log(`Route: ${departureCityName} to ${destinationCityName}`);
    // Add type checks before using substring for logging
    if (typeof messages[0].content === 'string') {
      console.log("SYSTEM MESSAGE:", messages[0].content.substring(0, 200) + "..."); // Log more of system prompt
    } else {
       console.log("SYSTEM MESSAGE: (Not a simple string)");
    }
    if (typeof messages[1].content === 'string') {
      console.log("USER MESSAGE (AI Input JSON):", messages[1].content.substring(0, 200) + "...");
      console.log("USER MESSAGE TOTAL LENGTH:", messages[1].content.length);
    } else {
       console.log("USER MESSAGE: (Not a simple string)");
    }

    // Function to process the seoDescription to ensure proper paragraph spacing
    const processDescription = (description: string): string => {
      if (!description) return '';

      // Ensure paragraph breaks are properly formatted
      let processed = description;

      // First, normalize all newlines to \n
      processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Ensure proper paragraph breaks with double newlines
      processed = processed.replace(/\n{3,}/g, '\n\n'); // No more than double newlines

      // Explicitly replace single newlines with double newlines for better consistency across environments
      processed = processed.replace(/\n(?!\n)/g, '\n\n');

      // If there's a lot of text with no paragraph breaks, try to add some
      if (!processed.includes('\n\n') && processed.length > 300) {
        // Look for potential paragraph breaks (sentences that end with periods followed by spaces)
        // But avoid breaking up bulleted lists
        const sentences: string[] = processed.split(/(?<=\.)\s+(?=[A-Z])/g);

        if (sentences.length >= 3) {
          // Group sentences into reasonable paragraph sizes (2-4 sentences)
          const paragraphs: string[] = [];
          const currentParagraph: string[] = [];

          for (const sentence of sentences) {
            currentParagraph.push(sentence);

            // Check if we have enough sentences for a paragraph
            if (currentParagraph.length >= 3 ||
                (currentParagraph.length >= 2 && currentParagraph.join(' ').length > 150)) {
              paragraphs.push(currentParagraph.join(' '));
              currentParagraph.length = 0; // Clear the array
            }
          }

          // Add any remaining sentences
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' '));
          }

          // Join paragraphs with double newlines
          processed = paragraphs.join('\n\n');
        }
      }

      // Process line by line to preserve bullet points
      const lines = processed.split('\n');
      let result = '';
      let inList = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

        // Check if this is a list header or bullet item
        if (line.match(/^(Cities Served:|Hotels Served:)/) ||
            nextLine.match(/^- /) || line.match(/^- /)) {
          inList = true;
          result += line + '\n';
        } else if (inList && line.trim() === '') {
          // Empty line after list ends the list context
          inList = false;
          result += '\n\n';
        } else if (inList) {
          // Still in list context
          result += line + '\n';
        } else {
          // Regular paragraph text - add double newline if not already there
          const needsNewline = !result.endsWith('\n\n') && result.length > 0;
          result += line + (needsNewline ? '\n\n' : '');
        }
      }

      // Ensure there aren't excessive newlines (more than 2)
      processed = result.trim().replace(/\n{3,}/g, '\n\n');

      // Ensure even empty lines are preserved by replacing with HTML paragraph breaks
      processed = processed.replace(/\n\n/g, '\n\n');

      return processed;
    };

    // Function to generate content, with retry capability
    const generateContent = async (retryCount = 0, maxRetries = 2) => {
      console.log(`Generate attempt ${retryCount + 1}/${maxRetries + 1}`);

      try {
        // Generate content with OpenAI using the new messages array
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: messages, // Use the messages array here
          temperature: 0.6, // Adjusted temperature as per example
          max_tokens: 2000,
          // Removed response_format parameter
        });

        // Get the response text
        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new Error('No response from OpenAI');
        }

        // Log raw response for debugging
        console.log("RAW OPENAI RESPONSE LENGTH:", responseText.length);
        console.log("RAW OPENAI RESPONSE SAMPLE:", responseText.substring(0, 200) + "...");

        // Clean the response text to remove any potential control characters
        const cleanedText = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

        // Parse the cleaned JSON
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(cleanedText);
          console.log("Successfully parsed JSON response");
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          console.error("Raw text that failed to parse:", cleanedText.substring(0, 200) + "...");

          // If we have retries left, try again
          if (retryCount < maxRetries) {
            console.log("Retrying due to JSON parse error...");
            return generateContent(retryCount + 1, maxRetries);
          }

          throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
        }

        // Backend Safeguard for otherStops example text
        if (
          parsedResponse.otherStops &&
          typeof parsedResponse.otherStops === 'string' && // Ensure it's a string before checking
          parsedResponse.otherStops.trim().toLowerCase().startsWith("e.g.")
        ) {
          console.log("AI returned example text for otherStops, setting to null."); // Optional log
          parsedResponse.otherStops = null;
        }

        // Process the main seoDescription first
        let finalSeoDescription = '';
        if (parsedResponse.seoDescription && typeof parsedResponse.seoDescription === 'string') {
          finalSeoDescription = processDescription(parsedResponse.seoDescription);
          console.log("PROCESSED DESCRIPTION SAMPLE:",
            finalSeoDescription.substring(0, 150).replace(/\n/g, "\\n") + "...");
        } else {
           // Handle missing/invalid seoDescription
           if (retryCount < maxRetries) {
              console.warn(`Retrying: Missing or invalid seoDescription in AI response.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
           }
           console.warn(`Missing or invalid seoDescription after retries. Proceeding with empty description.`);
           // No need to throw error here if metaTitle etc are present, just proceed with empty desc
        }

        // Assign the processed description back to the response object
        parsedResponse.seoDescription = finalSeoDescription;

        // Validate required fields (Adjusted Validation Logic for metaTitle)
        // Now expecting: metaTitle, metaDescription, metaKeywords, seoDescription
        const requiredFields = ['metaTitle', 'metaDescription', 'metaKeywords', 'seoDescription'];
        for (const field of requiredFields) {
          // Check if field is truly missing (undefined or null)
          // Allow empty string for all these fields after retries
          if (parsedResponse[field] === undefined || parsedResponse[field] === null) {
             // Allow retry if a required field is missing
            if (retryCount < maxRetries) {
              console.warn(`Retrying: Missing required field '${field}' (undefined/null) in AI response.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
            }
            // If out of retries, assign empty string instead of throwing error
            console.warn(`Required field '${field}' is missing after retries. Proceeding with empty string.`);
            parsedResponse[field] = ''; // Assign empty string
          }
          // Check type if field exists and is not null (allow empty strings)
          else if (typeof parsedResponse[field] !== 'string') {
             // Allow retry if type is wrong
            if (retryCount < maxRetries) {
              console.warn(`Retrying: Field '${field}' has incorrect type (${typeof parsedResponse[field]}). Expected string.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
            }
             // If still wrong type after retries, assign empty string
            console.warn(`Field '${field}' has incorrect type (${typeof parsedResponse[field]}) after retries. Resetting to empty string.`);
            parsedResponse[field] = ''; // Assign empty string
          }
        }


        // Validate optional fields type (should be string or null)
        // Now expecting: otherStops, travelTime
        const optionalStringFields = ['otherStops', 'travelTime'];
        for (const field of optionalStringFields) {
            // Check if the field exists and is not null, then validate its type
            if (parsedResponse[field] !== undefined && parsedResponse[field] !== null) {
                 if (typeof parsedResponse[field] !== 'string') {
                    if (retryCount < maxRetries) {
                       console.warn(`Retrying: Optional field '${field}' has incorrect type (${typeof parsedResponse[field]}). Expected string or null.`);
                       return generateContent(retryCount + 1, maxRetries); // Retry
                    } else {
                       console.warn(`Optional field '${field}' has incorrect type (${typeof parsedResponse[field]}) after retries. Setting to null.`);
                       parsedResponse[field] = null; // Set to null if type is wrong after retries
                    }
                 }
            } else {
                 // If field is undefined or null, ensure it's set to null
                 parsedResponse[field] = null;
            }
        }
        // --- End of Corrected Validation Loop ---

        // Remove amenitySummaryLine if it exists (no longer expected)
        if ('amenitySummaryLine' in parsedResponse) {
            delete parsedResponse.amenitySummaryLine;
        }

        // Add displayName field (if needed, though maybe not necessary if only returning specific fields)
        // parsedResponse.displayName = `Shuttles from ${departureCityName} to ${destinationCityName}`;

        // Ensure suggestedHotels is not present
        if ('suggestedHotels' in parsedResponse) {
            delete parsedResponse.suggestedHotels;
        }

        console.log("Content generation successful");
        return parsedResponse;
      } catch (error) {
        // If we have retries left for any error, try again
        if (retryCount < maxRetries) {
          console.log(`Retrying due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return generateContent(retryCount + 1, maxRetries);
        }
        throw error;
      }
    };

    // Execute content generation with retry capability
    const parsedResponse = await generateContent();
    const finalJsonResponse = NextResponse.json(parsedResponse);
    console.log("--- Successfully generated and returning JSON response ---");
    return finalJsonResponse;

    // --- END ORIGINAL LOGIC (Restored) ---

  } catch (error: any) { // Ensure catch handles 'any' type
    console.error('--- Top Level Error in generate-content API ---');
    console.error('Error generating content:', error);
    // Ensure even top-level errors return JSON
    return NextResponse.json(
      { error: error?.message ?? 'An unexpected error occurred during content generation.' },
      { status: 500 }
    );
  }
}
