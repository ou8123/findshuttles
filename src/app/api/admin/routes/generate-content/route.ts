import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Initialize OpenAI client
const openai = new OpenAI();

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
    const { departureCityId, destinationCityId, additionalInstructions } = body;

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
    const basePrompt = `Generate an SEO-optimized description for a shuttle route from ${departureCity.name} to ${destinationCity.name} in ${destinationCity.country.name}. This is a transport service connecting travelers efficiently between destinations. We are a booking platform partnered with reputable local shuttle providers.

Return the response in JSON format as follows:

{
  "metaTitle": "${departureCity.name} to ${destinationCity.name}, ${destinationCity.country.name} | Shuttle & Transfer Service",
  "metaDescription": "Convenient shuttle service from ${departureCity.name} to ${destinationCity.name}. Easy online booking with reliable local providers.",
  "metaKeywords": "${departureCity.name}, ${destinationCity.name}, ${destinationCity.country.name} shuttle, airport transfer, private shuttle, ${destinationCity.name} attractions",
  "seoDescription": "[Generated detailed description]"
}

For the seoDescription, craft a compelling, professional narrative that:

1. Introduces the shuttle service (mentioning that we connect travelers with local transport providers naturally).
2. Describes the ease and efficiency of the journey.
3. Briefly highlights key destination attractions (without overloading on sightseeing details).
4. Mentions estimated travel time and any notable stops if applicable.
5. Ends with a natural call-to-action, encouraging travelers to book.

Writing Style Guidelines:
- Professional and engaging—make it feel naturally written by a human.
- Clear and concise, balancing useful travel information without unnecessary fluff.
- SEO-focused without keyword stuffing—ensure readability comes first.
- No first-person language (avoid "our shuttles"; focus on the service).
- No mentions of vehicle types or driver details, as these may vary.`;

    // Add additional instructions if provided
    const prompt = additionalInstructions 
      ? `${basePrompt}\n\nAdditional requirements:\n${additionalInstructions}`
      : basePrompt;

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
            content: "You are a travel content expert specializing in SEO-optimized content for transportation services. Your task is to generate high-quality, professional descriptions for shuttle routes. Always respond with a valid JSON object containing these exact fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown code blocks or any other formatting."
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

      // Clean up the response
      const cleanContent = messageContent
        .replace(/```json\s*/g, '') // Remove ```json
        .replace(/```\s*/g, '') // Remove ```
        .replace(/^\s+/gm, '') // Remove leading whitespace
        .replace(/\t/g, '') // Remove tabs
        .trim(); // Remove any trailing whitespace
      
      console.log('Cleaned content:', cleanContent);
      
      let parsedContent: GeneratedContent;
      try {
        parsedContent = JSON.parse(cleanContent);
      } catch (error) {
        console.error('Failed to parse OpenAI response:', messageContent);
        console.error('Parse error:', error);
        throw new Error('Failed to parse generated content');
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
