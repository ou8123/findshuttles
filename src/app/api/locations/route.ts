import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Check if we want all cities or only departure cities
    const url = new URL(request.url);
    const onlyDepartures = url.searchParams.get('departures_only') === 'true';
    
    console.log(`Fetching locations with departures_only=${onlyDepartures}`);

    // Get all countries with their cities
    const countries = await prisma.country.findMany({
      include: {
        cities: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: {
              select: {
                id: true,
                name: true
              }
            },
            routesFrom: {
              select: {
                id: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data based on the query parameter
    const processedCountries = countries.map(country => {
      // Either filter to only departure cities or include all cities
      const filteredCities = onlyDepartures 
        ? country.cities.filter(city => city.routesFrom.length > 0)
        : country.cities;
        
      return {
        id: country.id,
        name: country.name,
        slug: country.slug,
        cities: filteredCities.map(({ id, name, slug, country }) => ({ 
          id, 
          name, 
          slug,
          country: {
            id: country.id,
            name: country.name
          }
        }))
      };
    }).filter(country => country.cities.length > 0); // Remove countries with no cities after filtering

    // Log for debugging
    console.log('Found cities by country:', 
      processedCountries.map(c => 
        `${c.name}: ${c.cities.map(city => `${city.name}`).join(', ')}`
      ).join(' | ')
    );

    return NextResponse.json(processedCountries);

  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
