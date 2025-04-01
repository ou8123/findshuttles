import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

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

    const response = NextResponse.json(destinationCities);
    return addCorsHeaders(response);

  } catch (error) {
    console.error(`Error fetching valid destinations for departure ${departureCityId}:`, error);
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // Retry logic for database connection issues
    while (retryCount < maxRetries) {
      try {
        retryCount++;
        console.log(`Retrying database query (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        const routes = await prisma.route.findMany({
          where: { departureCityId },
          select: {
            destinationCity: {
              select: {
                id: true,
                name: true,
                slug: true,
                country: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          },
          distinct: ['destinationCityId'],
        });

        const destinationCities = routes
          .map(route => route.destinationCity)
          .filter(city => city !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

        const response = NextResponse.json(destinationCities);
        return addCorsHeaders(response);
      } catch (retryError) {
        console.error(`Retry ${retryCount} failed:`, retryError);
        if (retryCount === maxRetries) {
          const response = NextResponse.json(
            { error: "Failed to fetch valid destinations" },
            { status: 500 }
          );
          return addCorsHeaders(response);
        }
      }
    }
  }
}
