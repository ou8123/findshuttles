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
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'Content generation service is not properly configured' },
        { status: 503 }
      );
    }

    // Parse the request body once to get all needed variables
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
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
    console.log(`Route Type Flags: Pickup=${isAirportPickup}, Dropoff=${isAirportDropoff}, City=${isCityToCity}`);
    console.log(`Additional instructions: ${additionalInstructions.substring(0, 100)}${additionalInstructions.length > 100 ? '...' : ''}`);

    // Preprocess the additional instructions (neutralize tone, remove URLs, remove tax mentions)
    const processedInstructions = preprocessAdditionalInstructions(additionalInstructions);
    
    // --- Prepare prompt for OpenAI using the new structure ---
    const systemPromptContent = `You are a professional travel writer creating SEO-optimized content for airport and intercity shuttle routes. Your task is to generate concise, informative, and professional content tailored for travelers booking point-to-point transport. Always return a valid JSON object with the fields: metaTitle, metaDescription, metaKeywords, seoDescription, otherStops, travelTime, and suggestedHotels. Do not include markdown, formatting, or commentary.`;
    
    // Base part of the user prompt
    let userPromptContent = `Generate content for a shuttle route from ${departureCityName} to ${destinationCityName} in ${destinationCountryName}. This is a one-way transport service. Use a neutral, professional, and helpful tone.

Do not include:
- Mentions of hotels, specific pickup/drop-off locations, or surrounding towns (this is shown elsewhere on the page)
- Mentions of the platform name (e.g., BookShuttles.com)
- Promotional or emotional language
- Travel time in the seoDescription (this is returned separately and shown at the top)
- Any use of possessive phrasing like “our shuttle,” “our service,” or “our drivers.” Refer to the transport as “this shuttle service,” “the provider,” or simply “the service.”
- Mentions of taxes, fees, or handling charges.

Return ONLY a valid JSON object in this format:
{
  "metaTitle": "String (max 70 characters): SEO title for the route page.",
  "metaDescription": "String (150–160 characters): SEO meta description summarizing the route and destination.",
  "metaKeywords": "String: Comma-separated keywords including city names, country, 'shuttle', 'transfer', 'transport', and 1–2 attractions.",
  "seoDescription": "String (2–3 concise paragraphs): See structure below.",
  "otherStops": "String (optional, max 50 characters): List 1–3 plausible intermediate towns or cities. Return null if not explicitly instructed. CRITICAL: Do not return placeholder text like 'e.g., Town A, Town B'.",
  "travelTime": "String (optional, max 30 characters): e.g., 'Approx. 2–3 hours'. Return null if unknown.",
  "suggestedHotels": "Array of 2–5 hotel names (strings), or null if no suggestions."
}

seoDescription Structure:
`;

    // Conditionally add SEO description structure based on route type flags
    // Prioritize Airport Dropoff for the specific airport prompt
    if (isAirportDropoff) { // Use the flag from the request
      userPromptContent += `
This route is an AIRPORT DROPOFF. Structure the description accordingly:

1. Paragraph 1 – Airport Transfer Focus:
- Describe the route as a practical airport drop-off service TO the airport (${destinationCityName}).
- Emphasize convenience for catching a flight.
- Briefly mention general amenities (A/C, Wi-Fi, etc.) if known.
- Do not include travel time, platform branding, or hotel names.
- Do not use possessive phrasing.
- Use a neutral, professional tone. If including any goodbye/farewell phrasing, use it sparingly, as the traveler may not be leaving the country.

2. Paragraph 2 – Optional Local Highlights (${destinationCityName}):
- Use varied transitional language such as:
  - “If you have time before your flight…”
  - “If ${destinationCityName} is part of your itinerary…”
  - “For those with a day or two to explore near the airport…”
- Mention 2–3 named attractions in or near the city (resorts, parks, beaches, etc.).
- Include 1–2 activities (surfing, kayaking, hiking, birdwatching, etc.).

3. (Optional) Paragraph 3 – Wrap-Up:
- Optionally provide a helpful summary or final tip.
- Keep the tone factual and informative — not promotional.
`;
    } else if (isAirportPickup) { // Use the flag from the request
        // Structure for Airport Pickup (similar but focuses on arrival)
        userPromptContent += `
This route is an AIRPORT PICKUP. Structure the description accordingly:

1. Paragraph 1 – Arrival & Welcome:
- Describe the route as a pickup service FROM the airport (${departureCityName}).
- Emphasize convenience for arriving travelers heading to ${destinationCityName}.
- Use varied welcome language like:
  - “Welcome to ${destinationCountryName}”
  - “Adventure awaits in ${destinationCountryName}”
  - “Upon arrival in ${destinationCountryName}…” 
  - You may also invent your own warm, professional welcoming lines.
- Mention general amenities (A/C, Wi-Fi, airport greeting, etc.) if known.
- Do not include travel time, platform branding, or hotel names.
- Keep tone friendly, but not overdone.

2. Paragraph 2 – Destination Overview (${destinationCityName}):
- Introduce ${destinationCityName} briefly.
- Mention 2–3 named attractions in or near the city (resorts, beaches, parks, volcanoes, etc.).
- Include 1–2 activities like surfing, hiking, estuary tours, kayaking, etc.

3. (Optional) Paragraph 3 – Wrap-Up:
- Add a helpful travel tip or regional summary.
- Keep tone factual and helpful.
`;
    } else { // Default to City-to-City
      userPromptContent += `
This route is a CITY-TO-CITY transfer. Structure the description accordingly:

1. Paragraph 1 – Transport Overview:
- Describe the route as a point-to-point shuttle between ${departureCityName} and ${destinationCityName}.
- Mention general amenities if applicable (A/C, Wi-Fi, reclining seats, snack stops, etc.).
- Use light travel-forward tone with variety (e.g., “your next adventure,” “enjoy the scenery,” “journey onward,” etc.).
- Do not include travel time or hotel/platform branding.
- Avoid possessive phrasing like “our shuttle” or “our drivers.”

2. Paragraph 2 – Destination Overview (${destinationCityName}):
- Introduce the city briefly.
- Mention 2–3 named attractions (resorts, national parks, beaches, adventure parks, volcanoes, waterfalls, hiking trails, etc.).
- Include 1–2 popular activities like birdwatching, surfing, kayaking, ziplining, etc.

3. (Optional) Paragraph 3 – Wrap-Up:
- Optionally conclude with a neutral summary or travel context.
- Maintain a factual and informative tone.
`;
    }

    // Add Hotel Suggestions instructions (applies to all route types)
    userPromptContent += `

Hotel Suggestions (new field):
If applicable, return a field called suggestedHotels, which is an array of 2–5 hotel names (as strings) that are likely served by this shuttle route. Base your suggestions on well-known, established hotels or resorts in the destination city (${destinationCityName}).

Format example: ["Hotel Costa Verde", "Si Como No Resort", "Hotel Pochote Grande"]

If unsure or there are no prominent options, return null.

Do not include extra commentary — only hotel names in an array.`;

    // Conditionally append processed instructions from the form
    if (processedInstructions) {
      userPromptContent += `\n\nThe following is additional information about this specific service. Use it naturally to improve the quality and accuracy of the output:\n${processedInstructions}`;
    }

    // Construct the messages array
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPromptContent
      },
      {
        role: "user",
        content: userPromptContent 
      }
    ];
    // --- End Prompt Preparation ---


    // Enhanced debugging logs
    console.log("---------- CONTENT GENERATION REQUEST ----------");
    console.log(`Route: ${departureCityName} to ${destinationCityName}`);
    // Add type checks before using substring for logging
    if (typeof messages[0].content === 'string') {
      console.log("SYSTEM MESSAGE:", messages[0].content.substring(0, 100) + "...");
    } else {
       console.log("SYSTEM MESSAGE: (Not a simple string)");
    }
    if (typeof messages[1].content === 'string') {
      console.log("USER MESSAGE SAMPLE:", messages[1].content.substring(0, 200) + "...");
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
          max_tokens: 2000  
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
        
        // Process the seoDescription to ensure proper paragraph spacing
        if (parsedResponse.seoDescription) {
          parsedResponse.seoDescription = processDescription(parsedResponse.seoDescription);
          
          // Log a sample of processed description
          console.log("PROCESSED DESCRIPTION SAMPLE:", 
            parsedResponse.seoDescription.substring(0, 150).replace(/\n/g, "\\n") + "...");
        }
        
        // Validate required fields (seoDescription is mandatory, others might be generated)
        const requiredFields = ['metaTitle', 'metaDescription', 'metaKeywords', 'seoDescription'];
        // Optional fields: otherStops, travelTime, suggestedHotels
        for (const field of requiredFields) {
          if (!parsedResponse[field]) {
            // Allow retry if a required field is missing
            if (retryCount < maxRetries) {
              console.warn(`Retrying: Missing required field '${field}' in AI response.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
            }
            // If out of retries, throw error only for absolutely essential fields
            if (field === 'seoDescription' || field === 'metaTitle') {
               throw new Error(`Missing required field '${field}' after retries.`);
            } else {
               console.warn(`Missing optional/recoverable field '${field}' after retries. Proceeding without it.`);
               parsedResponse[field] = ''; // Assign empty string to prevent downstream errors
            }
          }
          // Check type, allow null for optional fields
          if (typeof parsedResponse[field] !== 'string' && parsedResponse[field] !== null) {
             // Allow retry if type is wrong
            if (retryCount < maxRetries) {
              console.warn(`Retrying: Field '${field}' has incorrect type (${typeof parsedResponse[field]}). Expected string or null.`);
              return generateContent(retryCount + 1, maxRetries); // Retry
            }
             // If out of retries, handle based on field importance
            if (field === 'seoDescription' || field === 'metaTitle') {
              throw new Error(`Field '${field}' has incorrect type (${typeof parsedResponse[field]}) after retries. Expected string or null.`);
            } else {
               console.warn(`Field '${field}' has incorrect type (${typeof parsedResponse[field]}) after retries. Resetting to empty string.`);
               parsedResponse[field] = ''; // Assign empty string
            }
          }
        }

        // Validate optional fields type (should be string or null)
        const optionalStringFields = ['otherStops', 'travelTime'];
        for (const field of optionalStringFields) {
            if (parsedResponse[field] !== undefined && parsedResponse[field] !== null && typeof parsedResponse[field] !== 'string') {
                 if (retryCount < maxRetries) {
                    console.warn(`Retrying: Optional field '${field}' has incorrect type (${typeof parsedResponse[field]}). Expected string or null.`);
                    return generateContent(retryCount + 1, maxRetries); // Retry
                 } else {
                    console.warn(`Optional field '${field}' has incorrect type (${typeof parsedResponse[field]}) after retries. Setting to null.`);
                    parsedResponse[field] = null; // Set to null if type is wrong after retries
                 }
            }
             // Ensure optional fields exist, defaulting to null if undefined
            if (parsedResponse[field] === undefined) {
                parsedResponse[field] = null;
            }
        }
        
        // Validate suggestedHotels (should be array of strings or null)
        const hotelsField = 'suggestedHotels';
        if (parsedResponse[hotelsField] !== undefined && parsedResponse[hotelsField] !== null) {
            if (!Array.isArray(parsedResponse[hotelsField]) || !parsedResponse[hotelsField].every(item => typeof item === 'string')) {
                 if (retryCount < maxRetries) {
                    console.warn(`Retrying: Optional field '${hotelsField}' has incorrect type (${typeof parsedResponse[hotelsField]}). Expected array of strings or null.`);
                    return generateContent(retryCount + 1, maxRetries); // Retry
                 } else {
                    console.warn(`Optional field '${hotelsField}' has incorrect type (${typeof parsedResponse[hotelsField]}) after retries. Setting to null.`);
                    parsedResponse[hotelsField] = null; // Set to null if type is wrong after retries
                 }
            }
        } else if (parsedResponse[hotelsField] === undefined) {
             parsedResponse[hotelsField] = null; // Default to null if undefined
        }


        // Additional validation (optional): Check if additional instructions were incorporated
        // Note: Removed processedInstructions check as it's not part of the new prompt structure
        // if (processedInstructions && processedInstructions.length > 10) { ... }

        // Add displayName field
        parsedResponse.displayName = `Shuttles from ${departureCityName} to ${destinationCityName}`;
        
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
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}
