import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * API handler for search form submissions that performs server-side redirects.
 * This approach allows for full page loads instead of client-side navigation,
 * which solves issues with third-party widgets like Viator.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the form data from the request
    const formData = await request.formData();
    const departureCityId = formData.get('departureCityId') as string;
    const destinationCityId = formData.get('destinationCityId') as string;

    // Validate the required parameters
    if (!departureCityId || !destinationCityId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch city data with country info to properly construct route URLs
    const departureCity = await prisma.city.findUnique({
      where: { id: departureCityId },
      select: { 
        slug: true, 
        name: true,
        country: {
          select: { name: true }
        }
      },
    });

    const destinationCity = await prisma.city.findUnique({
      where: { id: destinationCityId },
      select: { 
        slug: true,
        name: true,
        country: {
          select: { name: true }
        }
      },
    });

    // Verify both cities were found
    if (!departureCity?.slug || !destinationCity?.slug) {
      return new NextResponse(
        JSON.stringify({ error: 'One or both cities not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // First check if a route already exists between these cities
    // This ensures we use custom route slugs if they've been defined
    const existingRoute = await prisma.route.findFirst({
      where: {
        departureCityId: departureCityId,
        destinationCityId: destinationCityId
      },
      select: {
        routeSlug: true
      }
    });

    let routeSlug;
    
    if (existingRoute) {
      // Use the custom slug defined in the admin panel
      routeSlug = existingRoute.routeSlug;
      console.log(`Using custom route slug: ${routeSlug}`);
    } else {
      // Fallback to constructing a slug if no route exists yet
      // Generate a standard slug without special handling for US cities
      routeSlug = `${departureCity.slug}-to-${destinationCity.slug}`;
      console.log(`Using generated URL format: ${routeSlug}`);
    }
    
    // Perform a 302 (temporary) redirect to the route page
    // Use NEXT_PUBLIC_SITE_URL for the base URL to ensure the correct domain
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bookshuttles.com';
    return NextResponse.redirect(new URL(`/routes/${routeSlug}`, siteUrl), 302);
  } catch (error: any) { // Explicitly type error as any for logging stack
    console.error('Error in search redirect:', error);
    // Log the full error object including stack trace
    console.error('Search redirect error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      // Include other relevant error properties if available
      // code: error.code,
      // meta: error.meta,
    });
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
