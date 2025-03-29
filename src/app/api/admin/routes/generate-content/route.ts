import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedContent {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  seoDescription: string;
}

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
    const prompt = `Generate SEO-friendly content for a shuttle route from ${departureCity.name} to ${destinationCity.name}. We are a booking platform affiliated with local shuttle companies throughout ${destinationCity.country.name}.

Please provide the following in JSON format:
{
  "metaTitle": "${departureCity.name} to ${destinationCity.name}, ${destinationCity.country.name} | Shuttle Service",
  "metaDescription": "150-160 character compelling description focusing on the journey and destination highlights",
  "metaKeywords": "relevant, comma-separated keywords including city names and attractions",
  "seoDescription": "400-600 word detailed description"
}

For the seoDescription, write a professional, engaging description that:
1. Briefly introduces the shuttle service (mention once that we're affiliated with local providers)
2. Highlights the main tourist attractions in ${destinationCity.name} (museums, beaches, parks, etc.)
3. Describes the journey experience (comfort, views, amenities)
4. Mentions approximate duration and any notable stops
5. Explains what makes this destination special
6. Ends with a call-to-action to book

Writing style:
- Keep the tone informative and professional
- Focus on the destination and travel experience
- Mention partnership/affiliation naturally, without overemphasis
- Avoid phrases like "our shuttles" - the focus is on the service and destination

Make the content engaging while following SEO best practices. Focus on what makes ${destinationCity.name} a compelling destination.`;

    console.log('Attempting to generate content with OpenAI...');
    
    try {
      // Add timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI request timed out')), 29000);
      });

      // OpenAI request promise
      const openaiPromise = openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a travel content expert who specializes in creating SEO-optimized content for transportation routes. Always respond in strict JSON format with these exact fields: metaTitle, metaDescription, metaKeywords, and seoDescription. For the seoDescription field, use '\\n' for line breaks. Do not include any other text outside the JSON object or any raw newlines in the response."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      // Race between timeout and OpenAI request
      const result = await Promise.race([openaiPromise, timeoutPromise]);
      
      // Type assertion since we know it's a ChatCompletion if we get here
      const completion = result as Awaited<typeof openaiPromise>;
      const messageContent = completion.choices[0].message.content;

      if (!messageContent) {
        console.error('OpenAI returned empty content');
        throw new Error('No content generated');
      }

      // Sanitize the response before parsing
      const sanitizedContent = messageContent
        .replace(/^\s+/gm, '') // Remove leading whitespace (including tabs)
        .replace(/\t/g, '') // Remove tabs
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/'/g, "'") // Replace smart quotes
        .replace(/'/g, "'") // Replace other smart quotes
        .replace(/"/g, '"') // Replace smart double quotes
        .replace(/"/g, '"') // Replace other smart double quotes
        .trim(); // Remove any trailing whitespace
      
      console.log('Sanitized content:', sanitizedContent);
      
      let parsedContent: GeneratedContent;
      try {
        parsedContent = JSON.parse(sanitizedContent);
      } catch (error) {
        // Try parsing with more lenient cleanup
        console.error('Failed to parse OpenAI response:', messageContent);
        console.error('Parse error:', error);
        
        const cleanContent = sanitizedContent
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          .replace(/\\n/g, ' ')
          .replace(/\\/g, '\\\\');
        
        console.log('Cleaned content:', cleanContent);
        parsedContent = JSON.parse(cleanContent);
      }

      // Log the parsed content
      console.log('Generated content:', {
        metaTitle: parsedContent.metaTitle,
        metaDescription: parsedContent.metaDescription?.substring(0, 50) + '...',
        metaKeywords: parsedContent.metaKeywords?.substring(0, 50) + '...',
        seoDescription: parsedContent.seoDescription?.substring(0, 50) + '...'
      });

      return NextResponse.json(parsedContent);

    } catch (error: any) {
      console.error('Error generating content:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      // Check if it's a timeout error
      if (error.message === 'OpenAI request timed out') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      
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