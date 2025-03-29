import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get all countries
    const countries = await prisma.country.findMany({
      include: {
        cities: {
          select: {
            id: true,
            name: true,
            slug: true,
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

    // Transform the data to include only cities that are departure cities
    const countriesWithDepartureCities = countries.map(country => ({
      id: country.id,
      name: country.name,
      slug: country.slug,
      cities: country.cities
        .filter(city => city.routesFrom.length > 0) // Only include cities that have routes starting from them
        .map(({ id, name, slug }) => ({ id, name, slug }))
    })).filter(country => country.cities.length > 0); // Remove countries with no departure cities

    // Log for debugging
    console.log('Found departure cities by country:', 
      countriesWithDepartureCities.map(c => 
        `${c.name}: ${c.cities.map(city => city.name).join(', ')}`
      ).join(' | ')
    );

    return NextResponse.json(countriesWithDepartureCities);

  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}