import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    let userMessage = `Generate a professional, SEO-friendly description for a shuttle route from ${departureCity.name} to ${destinationCity.name} in ${destinationCity.country.name}. This is a point-to-point transfer, not a guided tour. Our platform connects travelers with established local shuttle providers.

seoDescription Writing Instructions:
Write the seoDescription in two natural-sounding sections:

Part 1 – Transport Overview
Begin with a clear, professional introduction about the shuttle service. Focus on convenient point-to-point transport with support from local providers. Vary the phrasing—do not repeat the same sentence structure every time. Avoid vehicle and driver details. Example themes to rotate through:
- Easy and dependable transport
- Smooth connections between cities
- Stress-free travel for business or leisure
- Ideal for getting between destinations efficiently

Part 2 – Destination Overview
Transition to a destination-focused paragraph with varied, natural language. For example, begin with:
- "If ${destinationCity.name} is part of your travel plans…"
- "For those spending time in ${destinationCity.name}…"
- "Should you find yourself visiting ${destinationCity.name}…"
- "When exploring ${destinationCity.name}…"

Then briefly highlight 1–3 top attractions (parks, hikes, museums, beaches, etc.). Keep it helpful but not overly promotional. The goal is to inform, not oversell.

End with a subtle call-to-action that encourages travelers to book the shuttle.

Tone & Style Guidelines:
- Professional and informative
- Avoid marketing phrases like "premier platform" or "unmatched comfort"
- No vehicle or driver mentions
- No first-person language ("our shuttles," etc.)
- Prioritize readability and natural flow, with helpful destination insights`;

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

// Helper function to extract info from Viator HTML
function extractViatorInfo(html: string) {
  const info: {
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
