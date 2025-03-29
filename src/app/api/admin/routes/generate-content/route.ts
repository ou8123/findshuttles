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
    const { departureCityId, destinationCityId, additionalInfo } = body;

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

    // Construct the system message
    const systemMessage = `You are a travel content expert specializing in SEO-optimized content for transportation services. Your task is to generate high-quality, professional descriptions for shuttle routes. Always respond with a valid JSON object containing these exact fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown code blocks or any other formatting.`;

    // Construct the user message
    let userMessage = `Generate an SEO-optimized description for a shuttle route from ${departureCity.name} to ${destinationCity.name} in ${destinationCity.country.name}. This is a transport service connecting travelers efficiently between destinations. We are a booking platform partnered with reputable local shuttle providers.`;

    // Add additional info if provided
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
