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
  } = {};

  if (!html) return info;

  try {
    // Create a temporary div to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract vehicle/driver info from class names or IDs that might contain this info
    const vehicleInfo = doc.querySelector('.vehicle-info, #vehicle-details');
    if (vehicleInfo) info.vehicle = vehicleInfo.textContent?.trim();

    const driverInfo = doc.querySelector('.driver-info, #driver-details');
    if (driverInfo) info.driver = driverInfo.textContent?.trim();

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
    const systemMessage = `You are a travel content expert who specializes in writing professional, SEO-optimized content for shuttle transportation routes. Always return a valid JSON object with the following exact fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown, code formatting, or additional commentary.`;

    // Construct the user message
    let userMessage = `Generate professional, SEO-friendly content for a shuttle route from ${departureCity.name} to ${destinationCity.name} in ${destinationCity.country.name}. This is a point-to-point transport service for travelers (not a sightseeing tour). We are a booking platform that works with established local shuttle providers.`;

    // Add Viator info if available
    if (Object.keys(viatorInfo).length > 0) {
      userMessage += '\n\nSpecific route details from provider:';
      if (viatorInfo.vehicle) userMessage += `\nVehicle: ${viatorInfo.vehicle}`;
      if (viatorInfo.driver) userMessage += `\nDriver: ${viatorInfo.driver}`;
      if (viatorInfo.pickupPoints?.length) userMessage += `\nPickup points: ${viatorInfo.pickupPoints.join(', ')}`;
      if (viatorInfo.dropoffPoints?.length) userMessage += `\nDropoff points: ${viatorInfo.dropoffPoints.join(', ')}`;
      if (viatorInfo.routeDescription) userMessage += `\nRoute description: ${viatorInfo.routeDescription}`;
      if (viatorInfo.duration) userMessage += `\nDuration: ${viatorInfo.duration}`;
    }

    // Add any additional info
    if (additionalInfo) {
      userMessage += `\n\nAdditional route information: ${additionalInfo}`;
    }

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
