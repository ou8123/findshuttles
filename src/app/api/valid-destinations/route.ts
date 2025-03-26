import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const departureCityId = searchParams.get('departureCityId');

  if (!departureCityId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: departureCityId' },
      { status: 400 }
    );
  }

  try {
    // Find all routes originating from the given departure city
    const routes = await prisma.route.findMany({
      where: {
        departureCityId: departureCityId,
      },
      select: {
        // Select the destination city details
        destinationCity: {
          select: {
            id: true,
            name: true,
            slug: true,
            // Include country if needed for display grouping
            country: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      distinct: ['destinationCityId'], // Ensure we only get unique destination cities
    });

    // Extract and format the destination cities
    const destinationCities = routes
      .map(route => route.destinationCity)
      .filter(city => city !== null) // Filter out any potential nulls (shouldn't happen with schema)
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    return NextResponse.json(destinationCities);

  } catch (error) {
    console.error(`Error fetching valid destinations for departure ${departureCityId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch valid destinations" },
      { status: 500 }
    );
  }
}