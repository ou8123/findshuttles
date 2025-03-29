import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { departureCityName, destinationCityName, destinationCountryName } = await request.json();

    // Prepare prompt for OpenAI
    const systemMessage = `You are a professional travel writer creating SEO-optimized descriptions for shuttle transport services. Your task is to produce clear, neutral, and helpful content suitable for travelers using point-to-point shuttles, such as airport transfers or intercity transport. Always return a valid JSON object with the following fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown, code formatting, or any additional commentary.`;

    const userMessage = `Generate a professional, SEO-optimized description for a shuttle route from ${departureCityName} to ${destinationCityName} in ${destinationCountryName}. This is a point-to-point transfer used primarily by travelers, not commuters. Our platform partners with local shuttle providers.

Return the response as a JSON object in the following format:

{
  "metaTitle": "${departureCityName} to ${destinationCityName}, ${destinationCountryName} | Shuttle & Transfer Service",
  "metaDescription": "150–160 character summary focused on the transport route and destination city, written in a neutral tone.",
  "metaKeywords": "${departureCityName}, ${destinationCityName}, ${destinationCountryName} shuttle, airport transfer, transport service",
  "seoDescription": "[200–400 word description, divided into two simple paragraphs as described below]"
}

🔹 seoDescription Writing Instructions:
Paragraph 1 – Transport Summary
Briefly describe the shuttle service as a practical option for travelers needing reliable point-to-point transport. Mention the partnership with local providers in natural, varied language (e.g., "we work with local operators," "through partnerships with regional transport companies," etc.). Focus on the efficiency and simplicity of getting from one place to another.
Avoid:
- Vehicle descriptions
- Driver mentions
- Sensational or promotional language
- Any suggestion this is a daily commuter service

Paragraph 2 – Destination Overview
Include one short reference to visiting or spending time in the destination. Use varied phrasing (e.g., "If you're spending time in ${destinationCityName}…" or "For those planning a stay in ${destinationCityName}…").
Mention 1–2 key attractions or areas of interest, such as parks, beaches, or local highlights—written in a clean, matter-of-fact tone.
End with a simple sentence noting that the shuttle offers easy access to the destination.

✅ Style Guidelines:
- Tone: Neutral, professional, and concise
- Audience: Travelers using intercity or airport shuttle services
- Avoid: Promotional wording, emotional or exaggerated language
- Do not mention vehicles or drivers
- Keep everything focused, factual, and practical`;

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
