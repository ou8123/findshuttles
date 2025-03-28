// src/app/api/routes/[routeSlug]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Re-use or adapt the data fetching logic
async function getRouteDataForApi(slug: string) {
  try {
    const route = await prisma.route.findUnique({
      where: { routeSlug: slug },
      include: {
        departureCity: {
          select: { name: true, latitude: true, longitude: true }
        },
        departureCountry: { select: { name: true } },
        destinationCity: {
          select: { name: true, latitude: true, longitude: true }
        },
        destinationCountry: { select: { name: true } },
      },
    });
    return route;
  } catch (error) {
    console.error(`API Error fetching route data for slug ${slug}:`, error);
    // Throw an error or return null/undefined based on how you want to handle DB errors
    throw new Error("Database error occurred while fetching route data.");
  }
}

// Removed unused RouteSlugParams type alias
// type RouteSlugParams = { routeSlug: string };

export async function GET(request: Request, context: any) { // Use any for context type
  const params = context.params as { routeSlug: string }; // Extract and assert params type
  const { routeSlug } = params;

  if (!routeSlug) {
    return NextResponse.json({ error: 'Route slug is required' }, { status: 400 });
  }

  try {
    const routeData = await getRouteDataForApi(routeSlug);

    if (!routeData) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    return NextResponse.json(routeData);

  } catch (error: unknown) {
    // Log the error for server-side debugging
    console.error(`API route error for slug ${routeSlug}:`, error);
    // Determine the error message
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Return a generic error response
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}