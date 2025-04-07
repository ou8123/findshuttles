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
 * Generates suggested sightseeing waypoints using OpenAI based on a city and duration.
 * 
 * @param city The starting city name.
 * @param durationMinutes The approximate duration of the tour in minutes.
 * @returns A promise that resolves to an array of WaypointStop objects or an empty array if generation fails.
 */
export async function getSuggestedWaypoints({
  city,
  durationMinutes,
}: {
  city: string;
  durationMinutes: number;
}): Promise<WaypointStop[]> {
  
  // Basic validation
  if (!city || !durationMinutes || durationMinutes <= 0) {
    console.warn("Invalid input for getSuggestedWaypoints:", { city, durationMinutes });
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

  const prompt = `Suggest a realistic sightseeing driving route in or near ${city} that takes approximately ${estimatedHours.toFixed(1)} hours. Include ${maxStops} interesting and geographically logical stops (like landmarks, parks, scenic viewpoints, museums, or unique local attractions relevant to ${city}). Return ONLY a valid JSON object containing a single key "stops", where the value is an array of objects. Each stop object must have "name" (string), "lat" (number), and "lng" (number) properties. Ensure the latitude and longitude are accurate for the named location.`;

  console.log(`Requesting ${maxStops} waypoints for ${city} (${estimatedHours.toFixed(1)} hours) from OpenAI.`);

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

    console.log(`Successfully generated ${parsedResponse.stops.length} waypoints.`);
    return parsedResponse.stops;

  } catch (error) {
    console.error("Error calling OpenAI for waypoints:", error);
    return []; // Return empty array on API error
  }
}
