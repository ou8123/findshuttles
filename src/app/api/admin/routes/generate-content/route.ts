import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not set');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { departureCityId, destinationCityId } = body;

    if (!departureCityId || !destinationCityId) {
      return NextResponse.json(
        { error: 'Departure and destination cities are required' },
        { status: 400 }
      );
    }

    // Fetch city details
    const [departureCity, destinationCity] = await Promise.all([
      prisma.city.findUnique({
        where: { id: departureCityId },
        include: { country: true },
      }),
      prisma.city.findUnique({
        where: { id: destinationCityId },
        include: { country: true },
      }),
    ]);

    if (!departureCity || !destinationCity) {
      return NextResponse.json(
        { error: 'One or both cities not found' },
        { status: 404 }
      );
    }

    // Create prompt for ChatGPT
    const prompt = `Generate SEO-friendly content for a shuttle route from ${departureCity.name}, ${departureCity.country.name} to ${destinationCity.name}, ${destinationCity.country.name}.

Please provide the following in JSON format:
{
  "metaTitle": "60-70 character SEO-optimized title",
  "metaDescription": "150-160 character compelling meta description",
  "metaKeywords": "comma-separated keywords",
  "seoDescription": "400-600 word detailed description"
}

For the seoDescription, write a professional, human-like description that:
1. Starts with a brief introduction about the shuttle service between the cities
2. Highlights the main tourist attractions in ${destinationCity.name} (museums, beaches, parks, etc.)
3. Describes the travel experience (comfort, amenities, views)
4. Mentions approximate journey duration and key stops
5. Explains why this route is popular among tourists
6. Ends with a call-to-action to book the shuttle

Make the content engaging and informative while following SEO best practices. Focus on tourist attractions and travel experiences that make ${destinationCity.name} special.`;

    console.log('Attempting to generate content with OpenAI...');
    
    // Try GPT-4 without JSON mode first
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a travel content expert who specializes in creating SEO-optimized content for transportation routes. Always respond in strict JSON format with these exact fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include any other text outside the JSON object."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      // Parse the response
      const messageContent = completion.choices[0].message.content;
      if (!messageContent) {
        console.error('OpenAI returned empty content');
        throw new Error('No content generated');
      }

      try {
        const content = JSON.parse(messageContent);
        console.log('Generated content:', {
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription?.substring(0, 50) + '...',
          metaKeywords: content.metaKeywords?.substring(0, 50) + '...',
          seoDescription: content.seoDescription?.substring(0, 50) + '...'
        });
        return NextResponse.json(content);
      } catch (error) {
        console.error('Failed to parse OpenAI response:', messageContent);
        console.error('Parse error:', error);
        throw new Error('Failed to parse content as JSON');
      }

    } catch (error: any) {
      console.error('Error generating content:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in generate-content endpoint:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}