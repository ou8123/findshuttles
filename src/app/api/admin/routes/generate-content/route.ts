import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to extract info from Viator HTML
function extractViatorInfo(html: string) {
  const info: {
    vehicle?: string;
    driver?: string;
    pickupPoints?: string[];
    dropoffPoints?: string[];
    routeDescription?: string;
    duration?: string;
    attractions?: string[];
  } = {};

  if (!html) return info;

  try {
    // Create a temporary div to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract pickup/dropoff points
    const pickupPoints = Array.from(doc.querySelectorAll('.pickup-point, .departure-point'));
    if (pickupPoints.length > 0) {
      info.pickupPoints = pickupPoints.map(point => point.textContent?.trim()).filter(Boolean) as string[];
    }

    const dropoffPoints = Array.from(doc.querySelectorAll('.dropoff-point, .arrival-point'));
    if (dropoffPoints.length > 0) {
      info.dropoffPoints = dropoffPoints.map(point => point.textContent?.trim()).filter(Boolean) as string[];
    }

    // Extract route description
    const routeDesc = doc.querySelector('.route-description, #tour-description');
    if (routeDesc) info.routeDescription = routeDesc.textContent?.trim();

    // Extract duration
    const duration = doc.querySelector('.duration-info, #tour-duration');
    if (duration) info.duration = duration.textContent?.trim();

    // Extract attractions
    const attractions = Array.from(doc.querySelectorAll('.attraction, .point-of-interest'));
    if (attractions.length > 0) {
      info.attractions = attractions.map(attr => attr.textContent?.trim()).filter(Boolean) as string[];
    }

    return info;
  } catch (error) {
    console.error('Error parsing Viator HTML:', error);
    return info;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { departureCityId, destinationCityId, additionalInfo, viatorHtml } = body;

    // Fetch city and country details
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
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Extract info from Viator HTML if provided
    const viatorInfo = viatorHtml ? extractViatorInfo(viatorHtml) : {};

    // Construct the system message
    const systemMessage = `You are a professional travel writer who creates SEO-optimized content for transportation routes. Always return a valid JSON object with the following exact fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown, code blocks, or any additional formatting.`;

    // Construct the user message
    let userMessage = `Generate a professional, SEO-friendly description for a shuttle route from ${departureCity.name} to ${destinationCity.name} in ${destinationCity.country.name}. This is a point-to-point transfer, not a guided tour. Our platform connects travelers with established local shuttle providers.`;

    // Add Viator info if available
    if (Object.keys(viatorInfo).length > 0) {
      userMessage += '\n\nSpecific route details:';
      if (viatorInfo.pickupPoints?.length) userMessage += `\nPickup points: ${viatorInfo.pickupPoints.join(', ')}`;
      if (viatorInfo.dropoffPoints?.length) userMessage += `\nDropoff points: ${viatorInfo.dropoffPoints.join(', ')}`;
      if (viatorInfo.duration) userMessage += `\nDuration: ${viatorInfo.duration}`;
      if (viatorInfo.routeDescription) userMessage += `\nRoute description: ${viatorInfo.routeDescription}`;
      if (viatorInfo.attractions?.length) userMessage += `\nNearby attractions: ${viatorInfo.attractions.join(', ')}`;
    }

    // Add any additional info
    if (additionalInfo) {
      userMessage += `\n\nAdditional route information: ${additionalInfo}`;
    }

    // Add writing guidelines
    userMessage += `\n\nTone & Writing Guidelines:
- Use a professional, informative tone that reads like a human wrote it.
- Avoid all overly promotional phrases.
- Do not refer to vehicles or drivers.
- Avoid first-person phrases like "our shuttles" or "we provide."
- Focus on destination appeal and useful travel context.
- Include 1-3 top attractions in the destination.
- End with a natural call-to-action encouraging booking.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the response has all required fields
    const requiredFields = ['metaTitle', 'metaDescription', 'metaKeywords', 'seoDescription'];
    for (const field of requiredFields) {
      if (!parsedResponse[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
