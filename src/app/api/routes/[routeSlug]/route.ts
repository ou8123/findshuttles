import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Correct type signature for Next.js route handlers
export async function GET(
  request: Request,
  { params }: { params: { routeSlug: string } }
) {
  try {
    // Get the full route slug from the URL params
    let { routeSlug } = params;
    if (!routeSlug) {
      return NextResponse.json(
        { error: 'Route slug is required' },
        { status: 400 }
      );
    }
    
    console.log(`Original route slug from URL: ${routeSlug}`);
    
    // Check if we're on Netlify by looking at the URL or host header
    const isNetlify = process.env.NETLIFY === 'true' || 
                     request.headers.get('host')?.includes('netlify');
    
    // If on Netlify, the URL format might include country names that need to be stripped
    if (isNetlify && routeSlug.includes('-to-')) {
      // Parse complex Netlify URL format: city-country-to-city-country
      // We need to extract just the core route parts for database lookup
      const parts = routeSlug.split('-to-');
      if (parts.length === 2) {
        console.log(`Processing Netlify format URL with parts: ${parts[0]} to ${parts[1]}`);
        
        // Attempt to find the matching route in the database as is first
        const exactMatch = await prisma.route.findUnique({
          where: { routeSlug },
          select: { id: true }
        });
        
        if (exactMatch) {
          console.log(`Found exact match for route slug: ${routeSlug}`);
        } else {
          console.log(`No exact match found, will search for similar routes`);
          
          // If no exact match, try a more complex search
          const allRoutes = await prisma.route.findMany({
            select: { 
              routeSlug: true,
              departureCity: { select: { slug: true, name: true } },
              destinationCity: { select: { slug: true, name: true } }
            }
          });
          
          // Find a route that matches the basic pattern (any route between these cities)
          for (const route of allRoutes) {
            const depCityLower = route.departureCity.name.toLowerCase();
            const destCityLower = route.destinationCity.name.toLowerCase();
            
            const slugContainsBothCities = 
              (routeSlug.toLowerCase().includes(depCityLower) || 
               parts[0].toLowerCase().includes(depCityLower)) && 
              (routeSlug.toLowerCase().includes(destCityLower) || 
               parts[1].toLowerCase().includes(destCityLower));
            
            if (slugContainsBothCities) {
              console.log(`Found matching route: ${route.routeSlug}`);
              routeSlug = route.routeSlug;
              break;
            }
          }
        }
      }
    }
    
    console.log(`Final route slug for database lookup: ${routeSlug}`);

    const route = await prisma.route.findUnique({
      where: { routeSlug },
      select: {
        routeSlug: true,
        displayName: true,
        viatorWidgetCode: true,
        seoDescription: true,
        departureCity: {
          select: { 
            name: true, 
            latitude: true, 
            longitude: true 
          }
        },
        departureCountry: { 
          select: { name: true } 
        },
        destinationCity: {
          select: { 
            name: true, 
            latitude: true, 
            longitude: true 
          }
        },
        destinationCountry: { 
          select: { name: true } 
        },
      },
    });

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route data' },
      { status: 500 }
    );
  }
}
