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
      // Extract travelTime and otherStops from requestData if needed for prompt context
      // travelTime, 
      // otherStops 
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
    const departureCountryName = departureCity.country?.name || 'Unknown Country'; // Provide a fallback
    const destinationCountryName = destinationCity.country?.name || departureCountryName; // Use departure's if destination missing

    // Add a check in case country wasn't included properly (redundant with fallback but safe)
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

    // Retrieve travelTime and otherStops from the request body if available, otherwise use defaults or null
    // These might have been passed in the initial request or generated previously
    const travelTime = requestData.travelTime || null; 
    const otherStops = requestData.otherStops || []; // Default to empty array if not provided

    // Construct the messages array for OpenAI - ** NEW VERSION from User **
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `
You are a professional travel content writer generating SEO content for shuttle routes around the world. Assume locations are in the country provided unless stated otherwise. Avoid confusing cities with the same name in different countries (e.g., San Jose in Costa Rica vs. San Jose in California). Do not invent or assume details about a location. Write for a shuttle booking site that connects travelers with third-party transport providers.
`.trim()
      },
      {
        role: "user",
        content: `
Generate SEO content for the following shuttle route:

Route type: ${routeTypeString}
Departure city: ${departureCityName}, ${departureCountryName}
Destination city: ${destinationCityName}, ${destinationCountryName}
Is airport pickup? ${isAirportPickup}
Is airport dropoff? ${isAirportDropoff}
Travel duration: ${travelTime || 'Not provided'}
Other stops (if any): ${otherStops?.join(', ') || 'None'}
Additional comments: ${processedInstructions || 'None'}

Instructions:
- All content must be human-like, SEO-optimized, and in natural language.
- If the route is an **airport pickup**, open with a welcoming tone: e.g., “Welcome to ${destinationCountryName}” or “Adventure starts in ${destinationCountryName}…”
- If the route is an **airport dropoff**, start with dropoff info, then offer ideas for what to do in the area if travelers have time — no farewells unless appropriate.
- If departure and destination are the same (e.g., sightseeing route), DO NOT describe it as a transfer — highlight interesting stops or themes for the loop.
- For **private driving service**, describe it as flexible transport: “ideal for point-to-point transfers between smaller towns or for a full-day custom itinerary.”
- Always include **2–3 named attractions** in or near the destination: beaches, volcanoes, parks, waterfalls, cloud forests, adventure zones, etc.
- Tie **activities to attractions** (e.g., “surfing at Playa Tamarindo,” “hiking to La Fortuna Waterfall,” “ziplining in Monteverde”).
- Mention 1–2 relevant activities that match the attractions and local vibe.
- Do not mention vehicle type or driver unless details are explicitly provided.
- Do not name the operator or use vague marketing phrases like “premier service.”
- Output valid JSON with the exact structure below — do NOT include extra fields or explanations:

{
  "seoDescription": "Up to 3 paragraphs. First part focuses on the transport. Then introduce the destination with named places and activities.",
  "metaTitle": "Concise title like '[Departure] to [Destination] Shuttle'",
  "metaDescription": "1-sentence summary including transport and 1 destination highlight",
  "metaKeywords": "Comma-separated SEO keywords (route name, destinations, shuttle, attraction names, etc.)",
  "otherStops": ["List", "real", "intermediate", "places", "if", "any"],
  "travelTime": "e.g. 3.5 hours"
}
`.trim()
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

        // --- NEW: Validate mapWaypoints if present ---
        // Note: The prompt no longer asks for mapWaypoints here, so this validation might be redundant
        // but leaving it in case the AI still returns it sometimes.
        if ((routeTypeString === 'privateDrivingService' || routeTypeString === 'sightseeingShuttle') && parsedResponse.mapWaypoints) {
          if (
            !Array.isArray(parsedResponse.mapWaypoints) ||
            !parsedResponse.mapWaypoints.every(
              (wp: any) => // Use 'any' or define a Waypoint type
                typeof wp === 'object' &&
                wp !== null &&
                typeof wp.name === 'string' &&
                typeof wp.lat === 'number' && // Check for lat (number)
                typeof wp.lng === 'number'    // Check for lng (number)
            )
          ) {
            // If format is invalid, log a warning and remove the field
            console.warn("Invalid format for mapWaypoints received from AI. Removing field.");
            delete parsedResponse.mapWaypoints; // Or set to null: parsedResponse.mapWaypoints = null;
          } else {
             console.log(`Received ${parsedResponse.mapWaypoints.length} valid mapWaypoints.`);
          }
        } else if (parsedResponse.mapWaypoints) {
           // If waypoints are present for a type that shouldn't have them, remove them
           console.warn(`mapWaypoints received for unexpected routeType '${routeTypeString}'. Removing field.`);
           delete parsedResponse.mapWaypoints;
        }
        // --- END: Validate mapWaypoints ---

        // Ensure parsedResponse is an object before proceeding with field checks
        if (typeof parsedResponse !== 'object' || parsedResponse === null) {
           // Handle case where parsedResponse is not an object (e.g., retry or throw)
           if (retryCount < maxRetries) {
              console.warn(`Retrying: Parsed response is not an object.`);
              return generateContent(retryCount + 1, maxRetries);
           }
           throw new Error('Parsed OpenAI response was not a valid JSON object.');
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
        // Now expecting: metaTitle, metaDescription, metaKeywords, seoDescription, travelTime, otherStops
        const requiredFields = ['metaTitle', 'metaDescription', 'metaKeywords', 'seoDescription', 'travelTime', 'otherStops'];
        const responseAsRecord = parsedResponse as Record<string, any>; // Cast here
        for (const field of requiredFields) {
          // Check if field is truly missing (undefined or null)
          // Allow empty string for string fields, null for others after retries
          if (responseAsRecord[field] === undefined || responseAsRecord[field] === null) {
             // Allow retry if a required field is missing
            if (retryCount < maxRetries) {
              console.warn(`Retrying: Missing required field '${field}' (undefined/null) in AI response.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
            }
            // If out of retries, assign default based on expected type
            console.warn(`Required field '${field}' is missing after retries. Proceeding with default.`);
            if (field === 'otherStops') {
                 responseAsRecord[field] = []; // Default to empty array for otherStops
            } else {
                 responseAsRecord[field] = ''; // Default to empty string for others
            }
          }
          // Check type if field exists and is not null (allow empty strings for string types)
          else if (field === 'otherStops') {
              if (!Array.isArray(responseAsRecord[field]) || !responseAsRecord[field].every(item => typeof item === 'string')) {
                  if (retryCount < maxRetries) {
                      console.warn(`Retrying: Field '${field}' has incorrect type (${typeof responseAsRecord[field]}). Expected array of strings.`);
                      return generateContent(retryCount + 1, maxRetries); // Retry
                  }
                  console.warn(`Field '${field}' has incorrect type (${typeof responseAsRecord[field]}) after retries. Resetting to empty array.`);
                  responseAsRecord[field] = []; // Reset to empty array
              }
          } else if (typeof responseAsRecord[field] !== 'string') {
             // Allow retry if type is wrong for other string fields
            if (retryCount < maxRetries) {
              console.warn(`Retrying: Field '${field}' has incorrect type (${typeof responseAsRecord[field]}). Expected string.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
            }
             // If still wrong type after retries, assign empty string
            console.warn(`Field '${field}' has incorrect type (${typeof responseAsRecord[field]}) after retries. Resetting to empty string.`);
            responseAsRecord[field] = ''; // Assign empty string
          }
        }


        // Validate optional fields type (should be string or null) - Now handled within the required loop above
        // const optionalStringFields = ['otherStops', 'travelTime']; // Removed this loop as fields are now required

        // --- NEW: Deduplicate metaKeywords ---
        if (responseAsRecord.metaKeywords && typeof responseAsRecord.metaKeywords === 'string') {
          const keywords = responseAsRecord.metaKeywords.split(',')
            .map(kw => kw.trim().toLowerCase()) // Trim whitespace and convert to lowercase for better matching
            .filter(kw => kw.length > 0); // Remove empty strings
          const uniqueKeywords = [...new Set(keywords)]; // Use Set for deduplication
          responseAsRecord.metaKeywords = uniqueKeywords.join(', '); // Join back with comma and space
          console.log("Deduplicated metaKeywords:", responseAsRecord.metaKeywords);
        }
        // --- END: Deduplicate metaKeywords ---


        // Cast to 'any' before final checks to bypass potential inference issues
        const finalResponse = parsedResponse as any;

        // Remove amenitySummaryLine if it exists (no longer expected)
        if ('amenitySummaryLine' in finalResponse) {
            delete finalResponse.amenitySummaryLine;
        }

        // Add displayName field (if needed, though maybe not necessary if only returning specific fields)
        // parsedResponse.displayName = `Shuttles from ${departureCityName} to ${destinationCityName}`;

        // Ensure suggestedHotels is not present
        if ('suggestedHotels' in finalResponse) {
            delete finalResponse.suggestedHotels;
        }

        console.log("Content generation successful");
        return finalResponse; // Return the casted variable
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
