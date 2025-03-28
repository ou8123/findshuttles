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
1. metaTitle (60-70 characters): An SEO-optimized title for the route page
2. metaDescription (150-160 characters): A compelling meta description for search results
3. metaKeywords: Relevant keywords for the route, separated by commas
4. seoDescription (400-600 words): A detailed, engaging description that includes:
   - Brief introduction about the route
   - Popular tourist attractions in ${destinationCity.name}
   - Travel experience and approximate duration
   - Key highlights along the way
   - Why travelers should choose this route

Make the content natural, informative, and engaging while maintaining SEO best practices.`;

    // Generate content using ChatGPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a travel content expert who specializes in creating SEO-optimized content for transportation routes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
// Parse the response
const messageContent = completion.choices[0].message.content;
if (!messageContent) {
  return NextResponse.json(
    { error: 'No content generated' },
    { status: 500 }
  );
}

const content = JSON.parse(messageContent);
return NextResponse.json(content);
    return NextResponse.json(content);

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}