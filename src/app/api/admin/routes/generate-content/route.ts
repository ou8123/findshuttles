import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Parse the request body once to get all needed variables
    const requestData = await request.json();
    const { 
      departureCityName, 
      destinationCityName, 
      destinationCountryName,
      additionalInfo = '' 
    } = requestData;

    // Prepare prompt for OpenAI
    const systemMessage = `You are a professional travel writer creating SEO-optimized descriptions for intercity and airport shuttle services. Your goal is to produce clean, concise, and informative content for travelers. Always return a valid JSON object with the fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown or extra formatting.`;

    // Check if additional info was provided
    const hasAdditionalInfo = additionalInfo && additionalInfo.trim().length > 0;

    const userMessage = `Create a concise, factual description for a shuttle service between ${departureCityName} and ${destinationCityName} in ${destinationCountryName}.

Return a JSON object in the following format:
{
  "metaTitle": "${departureCityName} to ${destinationCityName}, ${destinationCountryName} | Shuttle & Transfer Service",
  "metaDescription": "Brief, 150–160 character summary highlighting the route and destination, written in a neutral tone.",
  "metaKeywords": "${departureCityName}, ${destinationCityName}, ${destinationCountryName} shuttle, airport transfer, city-to-city transport",
  "seoDescription": "[See detailed instructions below for this field]"
}

🔹 seoDescription Writing Instructions:
${hasAdditionalInfo ? 
`I've provided additional information that should be used verbatim as the first paragraph:

"${additionalInfo}"

For the second paragraph (70-90 words), condense what would normally be two paragraphs into one coherent paragraph that includes:
- Brief practical information about the shuttle service (route details, purpose)
- A mention that this is an affiliate service connecting travelers to local operators
- Brief highlights of 1-2 key attractions in ${destinationCityName}` 
:
`Structure the description in two paragraphs:

Paragraph 1 (50-70 words) – Practical information about the shuttle service:
- Introduce the shuttle route neutrally (e.g., "This shuttle service connects ${departureCityName} and ${destinationCityName}...")
- Mention this is an affiliate service offered in collaboration with local providers
- Emphasize the simplicity, reliability, and practicality of the transfer

Paragraph 2 (30-50 words) – Brief destination overview:
- Include one natural reference to visiting the destination
- Briefly mention 1-2 notable local attractions in an informative tone
- End with a simple statement that this shuttle offers easy access to the area`}

✅ Style Guidelines:
- Total length: ${hasAdditionalInfo ? '150-180' : '100-150'} words
- Tone: Factual and informative, not promotional
- Avoid: Superlatives, promotional language, first-person, possessive phrases
- No specific claims about service quality, vehicles, or drivers
- Content should be valuable to travelers making transport decisions`;

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
