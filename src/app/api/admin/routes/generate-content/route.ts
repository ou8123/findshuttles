import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { departureCityName, destinationCityName, destinationCountryName } = await request.json();

    // Prepare prompt for OpenAI
    const systemMessage = `You are a travel content writer who specializes in professional, SEO-optimized descriptions for shuttle routes. Return a JSON object with exactly these fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include any additional text or formatting.`;

    const userMessage = `Generate an SEO-optimized description for a shuttle route from ${departureCityName} to ${destinationCityName} in ${destinationCountryName}. This is a point-to-point transport service, not a sightseeing tour.

Required format:
{
  "metaTitle": "50-60 character SEO title",
  "metaDescription": "150-160 character summary focusing on transport service",
  "metaKeywords": "comma-separated keywords",
  "seoDescription": "400-600 word description in two paragraphs: 1) transport service overview, 2) destination highlights"
}

Guidelines:
- Keep it professional and informative
- Focus on the transport service
- Avoid marketing buzzwords
- No HTML or special characters
- Use plain text only`;

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
