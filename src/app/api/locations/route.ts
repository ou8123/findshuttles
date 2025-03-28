import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() { // Removed unused request parameter
  try {
    const countriesWithCities = await prisma.country.findMany({
      orderBy: {
        name: 'asc', // Order countries alphabetically
      },
      include: {
        cities: {
          orderBy: {
            name: 'asc', // Order cities alphabetically within each country
          },
          select: { // Select only necessary city fields
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Optional: Transform data if needed, e.g., for easier consumption by dropdowns
    // const locations = countriesWithCities.map(country => ({
    //   country: country.name,
    //   cities: country.cities,
    // }));

    return NextResponse.json(countriesWithCities);

  } catch (error) {
    console.error("Error fetching locations:", error);
    // Return an error response
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// Optional: Add revalidation if locations change infrequently
// export const revalidate = 3600; // Revalidate every hour