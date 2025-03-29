import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { departureCityName, destinationCityName, destinationCountryName } = await request.json();

    // Prepare prompt for OpenAI
    const systemMessage = `You are a professional travel writer creating SEO-optimized descriptions for intercity and airport shuttle services. Your goal is to produce clean, concise, and informative content for travelers. Always return a valid JSON object with the fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown or extra formatting.`;

    const userMessage = `Write a concise, professional SEO description for a shuttle route from ${departureCityName} to ${destinationCityName} in ${destinationCountryName}. This is a point-to-point service typically used by travelers for airport or city-to-city transfers. The service is provided in partnership with local transport operators.

Return a JSON object in the following format:

{
  "metaTitle": "${departureCityName} to ${destinationCityName}, ${destinationCountryName} | Shuttle & Transfer Service",
  "metaDescription": "Brief, 150–160 character summary highlighting the route and destination, written in a neutral tone.",
  "metaKeywords": "${departureCityName}, ${destinationCityName}, ${destinationCountryName} shuttle, airport transfer, city-to-city transport",
  "seoDescription": "[200–300 word description, divided into two simple, informative paragraphs as described below]"
}

🔹 seoDescription Writing Instructions:
Paragraph 1 – Transport Summary
Introduce the shuttle route neutrally (e.g., "This shuttle service connects ${departureCityName} and ${destinationCityName}...").
Mention that the service is offered in collaboration with local providers, using varied language.
Emphasize the simplicity, reliability, and practicality of the transfer.
Avoid:
- Phrases like "our service," "we provide," etc.
- Mentioning specific vehicles or drivers
- Any exaggeration or marketing talk

Paragraph 2 – Destination Overview
Include one natural reference to visiting the destination, such as:
- "If you're spending time in ${destinationCityName}…"
- "Those visiting ${destinationCityName} will find…"
- "For travelers headed to ${destinationCityName}…"

Then briefly mention 1–2 notable local attractions (parks, beaches, landmarks, etc.) in an informative tone.
End with a simple statement that this shuttle offers easy access to the area.

✅ Style Guidelines:
- Tone: Neutral, concise, and informative
- Word count: 200–300 words total
- Audience: Travelers using transport—not commuters 
- No first-person, no possessive language
- No exaggerations or promotional phrasing`;

    // Generate content with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Get the response text
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    try {
      // Clean the response text to remove any potential control characters
      const cleanedText = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Parse the cleaned JSON
      const parsedResponse = JSON.parse(cleanedText);
      
      // Validate required fields
      const requiredFields = ['metaTitle', 'metaDescription', 'metaKeywords', 'seoDescription'];
      for (const field of requiredFields) {
        if (!parsedResponse[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
        if (typeof parsedResponse[field] !== 'string') {
          throw new Error(`Field ${field} must be a string`);
        }
      }

      // Add displayName field
      parsedResponse.displayName = `Shuttles from ${departureCityName} to ${destinationCityName}`;

      return NextResponse.json(parsedResponse);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      console.error('Raw response:', responseText);
      throw new Error('Invalid response format from OpenAI');
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}
