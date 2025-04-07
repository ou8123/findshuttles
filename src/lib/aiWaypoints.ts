import OpenAI from "openai";
import { Prisma } from '@prisma/client'; // Import Prisma types if needed elsewhere, though not directly here

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the structure for a waypoint stop
export type WaypointStop = {
  name: string;
  lat: number;
  lng: number;
};

// Define the expected structure of the arguments for the OpenAI function call
interface StopsFunctionArguments {
  stops: WaypointStop[];
}

/**
 * Generates suggested sightseeing waypoints using OpenAI based on a city, country, and duration.
 * 
 * @param city The starting city name.
 * @param country The country name for disambiguation.
 * @param durationMinutes The approximate duration of the tour in minutes.
 * @returns A promise that resolves to an array of WaypointStop objects or an empty array if generation fails.
 */
export async function getSuggestedWaypoints({
  city,
  country, // Add country parameter
  durationMinutes,
}: {
  city: string;
  country: string; // Add country type
  durationMinutes: number;
}): Promise<WaypointStop[]> {
  
  // Basic validation
  if (!city || !country || !durationMinutes || durationMinutes <= 0) { // Add country validation
    console.warn("Invalid input for getSuggestedWaypoints:", { city, country, durationMinutes });
    return [];
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured. Cannot generate waypoints.");
    return [];
  }

  // Calculate a reasonable number of stops based on duration
  // Example: 1 stop per 60-90 minutes, minimum 2, maximum 6? Adjust as needed.
  const estimatedHours = durationMinutes / 60;
  const maxStops = Math.max(2, Math.min(6, Math.floor(estimatedHours * 1.2))); // Adjust multiplier as needed

  // Update prompt with stronger geographic constraints
  const prompt = `
Suggest a realistic sightseeing driving route starting and ending in ${city}, ${country}.
This is a local tour within ${country}.
The route should take approximately ${estimatedHours.toFixed(1)} hours.
Include ${maxStops} interesting and geographically logical stops (like landmarks, parks, scenic viewpoints, museums, or unique local attractions relevant to ${city}, ${country}).
Return ONLY a valid JSON object containing a single key "stops", where the value is an array of objects.
Each stop object must have "name" (string), "lat" (number), and "lng" (number) properties.
Ensure the latitude and longitude are accurate for the named location AND correspond to a location within ${country}.

CRITICAL: All suggested waypoints MUST be located within ${country}. Double-check that the generated lat/lng coordinates fall within ${country}. Do NOT suggest any locations outside of ${country}, especially not in the USA (e.g., California). The entire route and all stops are in ${city}, ${country}.
`.trim(); // Added .trim() for safety

  console.log(`Requesting ${maxStops} waypoints for a local tour in ${city}, ${country} (${estimatedHours.toFixed(1)} hours) from OpenAI.`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Or your preferred model
      temperature: 0.7, // Allow for some creativity
      messages: [{ role: "user", content: prompt }],
      // Although we ask for JSON in the prompt, explicitly requesting JSON mode is more robust
      // if the model supports it. If not, we rely on parsing.
      // response_format: { type: "json_object" }, // Re-add if your model/version supports it
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error("OpenAI returned an empty response for waypoints.");
      return [];
    }

    console.log("Raw OpenAI Waypoint Response:", responseText.substring(0, 300) + "...");

    // Attempt to parse the JSON response
    let parsedResponse: StopsFunctionArguments;
    try {
      // Sometimes the model might wrap the JSON in markdown, try to extract it
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      const jsonToParse = jsonMatch ? jsonMatch[1] : responseText;
      parsedResponse = JSON.parse(jsonToParse);
      
      // Validate the structure
      if (!parsedResponse || !Array.isArray(parsedResponse.stops)) {
         throw new Error("Invalid JSON structure: 'stops' array not found.");
      }
      if (parsedResponse.stops.some(stop => !stop.name || typeof stop.lat !== 'number' || typeof stop.lng !== 'number')) {
         throw new Error("Invalid JSON structure: stop objects missing required fields or have incorrect types.");
      }

    } catch (parseError) {
      console.error("Failed to parse OpenAI waypoint response as JSON:", parseError);
      console.error("Raw text that failed:", responseText);
      return []; // Return empty array on parse failure
    }

    // --- Post-processing: Validate coordinates are within Costa Rica ---
    const costaRicaBounds = {
      minLat: 8.0,
      maxLat: 11.2,
      minLng: -85.9,
      maxLng: -82.5,
    };

    const validStops = parsedResponse.stops.filter(stop => 
      stop.lat >= costaRicaBounds.minLat &&
      stop.lat <= costaRicaBounds.maxLat &&
      stop.lng >= costaRicaBounds.minLng &&
      stop.lng <= costaRicaBounds.maxLng
    );

    if (validStops.length < parsedResponse.stops.length) {
        console.warn(`Filtered out ${parsedResponse.stops.length - validStops.length} waypoints outside Costa Rica bounds.`);
    }
    // --- End Post-processing ---


    console.log(`Successfully generated and validated ${validStops.length} waypoints.`);
    return validStops; // Return only the validated stops

  } catch (error) {
    console.error("Error calling OpenAI for waypoints:", error);
    return []; // Return empty array on API error
  }
}
