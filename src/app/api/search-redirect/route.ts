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

    // We'll now use a consistent format regardless of environment
    // This avoids issues with duplicate country names in URLs
    
    // Prepare clean city slugs without duplicate country names
    let departureSlug = departureCity.slug;
    let destinationSlug = destinationCity.slug;
    
    // Create the route slug consistently across all environments
    const routeSlug = `${departureSlug}-to-${destinationSlug}`;
    console.log(`Using clean URL format: ${routeSlug}`);
    
    // Perform a 302 (temporary) redirect to the route page
    // 302 is used instead of 301 to ensure no browser caching of the redirect
    return NextResponse.redirect(new URL(`/routes/${routeSlug}`, request.url), 302);
  } catch (error) {
    console.error('Error in search redirect:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
