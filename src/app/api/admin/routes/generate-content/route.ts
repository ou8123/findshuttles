import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Using shared authOptions
import slugify from 'slugify';
import { Prisma } from '@prisma/client'; // Import Prisma
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // Import type
import { matchAmenities } from '@/lib/amenity-matcher'; // Import matchAmenities
import { getSuggestedWaypoints, WaypointStop } from '@/lib/aiWaypoints'; // Import waypoint generation function and type
import { callOpenAISafe } from '@/lib/safeOpenAI'; // Import the safe helper
// Removed duplicate imports again

// OpenAI client initialization might not be needed if using the helper exclusively for this call
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

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

  // Remove external URLs and common promotional phrases
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

// Function to extract potential stops from text (Improved Logic)
function extractOtherStops(rawText: string): string[] {
  // Attempt to match patterns like "hotel in Santa Teresa, Malpais, Montezuma..."
  const cityListMatch = rawText.match(/hotel in ([^\.]+)/i);
  let cleaned: string[] = [];

  if (cityListMatch?.[1]) {
    cleaned = cityListMatch[1]
      ?.replace(/the\s+/gi, "") // Remove "the "
      ?.replace(/or /gi, "")    // Remove "or "
      ?.split(/,|\band\b/)      // Split by comma or "and"
      ?.map((c) => c.trim())    // Trim whitespace
      ?.filter(Boolean) ?? [];  // Remove empty strings
  } else {
    // Fallback or alternative pattern matching if needed
    // For now, if the primary pattern doesn't match, return empty
    // You could add the previous stopPattern logic here as a fallback if desired
    console.log("extractOtherStops: Primary pattern 'hotel in ...' not found.");
  }

  // Filter out common false positives
  const falsePositives = new Set(["Call", "Overview", "What", "Save", "Meet"]);
  const filtered = cleaned.filter((city) => !falsePositives.has(city));

  // Return unique stops
  return Array.from(new Set(filtered));
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
      additionalInstructions = '',
      viatorDestinationLink = null // ✅ Extract Viator link
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

    // Determine routeType string based on boolean flags (matching the prompt exactly)
    let routeTypeString = 'CITY_TO_CITY'; // Default
    if (isAirportPickup) routeTypeString = 'AIRPORT_PICKUP';
    else if (isAirportDropoff) routeTypeString = 'AIRPORT_DROPOFF';
    else if (isPrivateDriver) routeTypeString = 'PRIVATE_DRIVER';
    else if (isSightseeingShuttle) routeTypeString = 'SIGHTSEEING_SHUTTLE';
    // Note: isCityToCity flag isn't strictly needed if it's the default when others are false

    // Retrieve travelTime from the request body if available
    const travelTime = requestData.travelTime || null;
    // Extract otherStops from the processed instructions
    const extractedOtherStops = extractOtherStops(processedInstructions);
    // Use extracted stops if found, otherwise default to empty array
    const otherStops = extractedOtherStops.length > 0 ? extractedOtherStops : [];

    // --- Conditional Waypoint Generation (Step 1 from feedback) ---
    let mapWaypoints: WaypointStop[] = []; // Use WaypointStop[]
    let estimatedHours = 0;

    // Attempt to parse travelTime string into hours
    if (travelTime && typeof travelTime === 'string') {
      const match = travelTime.match(/(\d+(\.\d+)?)\s*hours?/i);
      if (match && match[1]) {
        estimatedHours = parseFloat(match[1]);
      }
    }

    // Use a default duration if parsing failed or travelTime was not provided
    const durationMinutes = estimatedHours > 0 ? estimatedHours * 60 : 180; // Default to 3 hours (180 minutes)

    if (routeTypeString === 'PRIVATE_DRIVER') { // Use routeTypeString
      console.log(`Generating waypoints for PRIVATE_DRIVER route (${departureCityName}, ${departureCountryName}) with estimated duration ${durationMinutes} minutes.`);
      try {
        const waypointResponse = await getSuggestedWaypoints({ // Use getSuggestedWaypoints
          city: departureCityName,
          country: departureCountryName,
          durationMinutes: durationMinutes,
        });
        mapWaypoints = waypointResponse || []; // getSuggestedWaypoints returns WaypointStop[] or []
        console.log(`Generated ${mapWaypoints.length} waypoints.`);
      } catch (waypointError) {
        console.error("Error generating waypoints:", waypointError);
        mapWaypoints = []; // Ensure mapWaypoints is an empty array on error
      }
    } else {
      console.log(`Route type is ${routeTypeString}, skipping waypoint generation.`);
    }
    // --- End Conditional Waypoint Generation ---


    // Define the user prompt content as a separate variable
    const userPromptContent = `
**Prompt for Generating SEO Content for Shuttle Routes**

**Objective:** Generate human-like, SEO-optimized content for the shuttle route defined by the variables below. The output must be valid JSON following the specified structure.

**Input Variables:**
Route type: ${routeTypeString}
Departure city: ${departureCityName}, ${departureCountryName}
Destination city: ${destinationCityName}, ${destinationCountryName}
Is airport pickup? ${isAirportPickup}
Is airport dropoff? ${isAirportDropoff}
Travel duration: ${travelTime || 'Not provided'}
Other stops (if any): ${otherStops?.join(', ') || 'None'}
Additional comments: ${processedInstructions || 'None'}
Destination tours link: ${viatorDestinationLink || 'None'}
Map Waypoints (for relevant types): ${mapWaypoints.length > 0 ? JSON.stringify(mapWaypoints) : '[]'}

**General Instructions:**
- All content must be human-like, SEO-optimized, and written in natural language.
- Avoid vague marketing language (e.g., "premier service"). Do not mention drivers, vehicle types, or operator names unless explicitly included in \`processedInstructions\`.
- Do not include references to bottled water, car seats, wheelchair access, service animals, or similar logistical amenities unless the admin UI matches them as real amenities.
- Output must be valid JSON. Do not include explanations or extra fields outside the defined structure.

**Required JSON Output Structure:**
{
  "seoDescription": "Up to 3 paragraphs. First focuses on the transport, second introduces destination highlights and activities. Optional short third paragraph if needed.",
  "metaTitle": "Concise title like '[Departure] to [Destination], [CountryName] Shuttles'", // Example for same-country route
  "metaDescription": "1-sentence summary including transport and 1 destination highlight",
  "metaKeywords": "Comma-separated SEO keywords (route name, destinations, shuttle, attraction names, etc.)",
  "otherStops": ["List", "real", "intermediate", "places", "if", "any"], // Populated based on 'Other stops' input
  "travelTime": "e.g. 3.5 hours",
  "mapWaypoints": ${routeTypeString === 'PRIVATE_DRIVER' ? JSON.stringify(mapWaypoints) : '[]'} // Conditionally include waypoints
}

**Global Content Rules:**
- **Word Count:** Max total word count for \`seoDescription\` is ~250 words.
- **Paragraphs:** \`seoDescription\` should have 2–3 paragraphs, each ~50–80 words.
- **Vocabulary:** Use varied, descriptive sentence structure and vocabulary.
- **Attractions & Activities:** Tie each named attraction to at least one relevant activity (e.g., “hike to La Fortuna Waterfall,” “surf at Playa Tamarindo,” “birdwatch in Monteverde Cloud Forest”).
- **Points of Interest Requirement:** For all CITY_TO_CITY, AIRPORT_PICKUP, and AIRPORT_DROPOFF routes, \`seoDescription\` must include **at least two named points of interest** at the destination, each with an associated **activity**.
- **Country Mentions:** For content involving only one country, mention the country name no more than once in the \`seoDescription\` unless essential for clarity.
- **Travel Time Formatting:** If travel time is a range (e.g., "1 to 3 hours"), output it as-is. If it’s a specific number (e.g., "1 hour"), display it as “About 1 hour.” Do not include "(approx.)".
- **Meta Title Formatting:** If departure and destination are in the same country, use format "[Departure] to [Destination], [CountryName] Shuttles". If different countries, use "[Departure], [DepartureCountry] to [Destination], [DestinationCountry] Shuttle".

**Route Type Specific Logic:**

**1. AIRPORT_PICKUP (\`routeTypeString\` = 'AIRPORT_PICKUP')**
- **Opening:** Start \`seoDescription\` with a warm, varied, and fun welcome message suitable for arriving travelers (e.g., "Your adventure in ${destinationCountryName} begins!", "Get ready to explore ${destinationCountryName}!", "Welcome to sunny ${destinationCountryName}!"). Avoid using the exact same opening every time.
- **Content:** Describe the convenience of the shuttle service from the airport. **Crucially, always include a sentence stating that pickup can also be arranged from nearby hotels or resorts.**
- Briefly highlight 2–3 attractions in or near the destination city, mentioning 1–2 possible related activities.

**2. AIRPORT_DROPOFF (\`routeTypeString\` = 'AIRPORT_DROPOFF')**
- **Opening:** Start \`seoDescription\` with information about the convenient drop-off at the airport.
- **Content:** If the airport city offers attractions relevant to travelers, suggest 2–3 notable ones and 1–2 associated activities.

**3. CITY_TO_CITY (\`routeTypeString\` = 'CITY_TO_CITY')**
- **Opening:** Mention the comfortable, direct transfer between the specified cities in \`seoDescription\`.
- **Content:** Briefly highlight 2–3 destination attractions (parks, beaches, volcanoes, etc.) and include 1–2 related activities travelers might enjoy, tying the activity to a named location.

**4. PRIVATE_DRIVER (\`routeTypeString\` = 'PRIVATE_DRIVER')**
- **First Paragraph:** Clearly state the service offers both **seamless city-to-city transfers** and **personalized custom tours** tailored to preferences. Explain it's ideal for flexible transfers (popular or off-the-beaten-path) and custom sightseeing day trips.
- **Waypoints:** If \`mapWaypoints\` are provided, treat them as **sample suggestions only**. Optionally mention 1–2 by name as possible stops during a custom tour.
- **Content:** Highlight 2–3 potential attraction options and 1–2 activities accessible from the departure/destination areas. Recommend at least 2 potential stops within ~20 miles of the departure city suitable for a day trip.
- **CTA:** ✅ Include a short, varied, friendly call to action at the end of \`seoDescription\` (e.g., “Plan your perfect Costa Rican adventure today!”).

**5. SIGHTSEEING_SHUTTLE (\`routeTypeString\` = 'SIGHTSEEING_SHUTTLE')**
- **Focus:** This is a round-trip sightseeing shuttle starting and ending in the same city. Focus \`seoDescription\` on the specific stops and themes of the route.
- **Content:** Highlight 3–5 specific attractions included in the shuttle tour. Briefly mention what travelers will see or do.
- **CTA:** ✅ Add a soft CTA at the end of \`seoDescription\` (e.g., “Reserve your seat and enjoy the scenic journey.”).

**Call to Action (CTA) Guidelines:**
- Use a soft, friendly CTA **only** for PRIVATE_DRIVER and SIGHTSEEING_SHUTTLE routes.
- Avoid CTAs on airport or city-to-city routes unless it feels natural within the flow.
- Keep CTAs short, warm, and varied — avoid repeating the exact same CTA across different routes.

**Final Check:** Ensure the generated output strictly adheres to the JSON structure and all content rules before finalizing.
`.trim(); // Moved closing backtick and trim() here

    // Construct the messages array for OpenAI - ** LATEST REFINED PROMPT **
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `
You are a professional travel content writer generating SEO content for shuttle routes around the world. Assume locations are in the country provided unless stated otherwise. Avoid confusing cities with the same name in different countries (e.g., San Jose in Costa Rica vs. San Jose in California). Do not invent or assume details about a location. Write for a shuttle booking site that connects travelers with third-party transport providers.
`.trim()
      },
      {
        role: "user",
        content: userPromptContent // Use the variable here
      } // End of user message object
    ]; // End of messages array definition
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
        // Generate content using the safe helper function
        const completionPayload = {
          model: "gpt-4-turbo-preview",
          messages: messages, // Use the messages array here
          temperature: 0.6, // Adjusted temperature as per example
          max_tokens: 2000,
          response_format: { type: "json_object" },
        };

        const safeCompletion = await callOpenAISafe({
          url: 'https://api.openai.com/v1/chat/completions',
          apiKey: process.env.OPENAI_API_KEY!,
          payload: completionPayload,
        });

        // Get the response text from the parsed JSON returned by the helper
        const responseText = safeCompletion.choices?.[0]?.message?.content;
        if (!responseText) {
          // callOpenAISafe should throw before this if response is invalid,
          // but check content existence for robustness.
          throw new Error('No valid content in OpenAI response');
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
        // Note: The prompt asks the AI to only include mapWaypoints for relevant types,
        // but we validate here as a safeguard.
        if ((routeTypeString === 'PRIVATE_DRIVER' || routeTypeString === 'SIGHTSEEING_SHUTTLE') && parsedResponse.mapWaypoints) {
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

        // --- Match Amenities based on generated content ---
        const matchedAmenityNames = await matchAmenities(finalResponse.seoDescription || '', processedInstructions);
        const allDbAmenities = await prisma.amenity.findMany({ select: { id: true, name: true } });
        const matchedAmenityIds = allDbAmenities
          .filter(amenity => matchedAmenityNames.includes(amenity.name))
          .map(amenity => amenity.id);

        // Add matchedAmenityIds to the response
        finalResponse.matchedAmenityIds = matchedAmenityIds;
        // --- End Match Amenities ---

        console.log("Content generation successful");
        return finalResponse; // Return the casted variable
      } catch (error) {
        // If we have retries left for any error, try again
        if (retryCount < maxRetries) {
          console.log(`Retrying due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return generateContent(retryCount + 1, maxRetries);
        }
        // Log more details about the specific error from OpenAI client
        console.error("--- OpenAI API Call Error Details ---");
        if (error instanceof Error) {
          console.error("Error Name:", error.name);
          console.error("Error Message:", error.message);
          // Log additional properties if available (e.g., status code for API errors)
          if ('status' in error) console.error("Status Code:", (error as any).status);
          if ('code' in error) console.error("Error Code:", (error as any).code);
          // console.error("Stack Trace:", error.stack); // Optional: might be too verbose
        } else {
          console.error("Caught non-Error object:", error);
        }
        console.error("--- End OpenAI API Call Error Details ---");

        // If we have retries left for any error, try again
        if (retryCount < maxRetries) {
          console.log(`Retrying due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Add a small delay before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return generateContent(retryCount + 1, maxRetries);
        }
        // If out of retries, re-throw the error to be caught by the top-level handler
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
