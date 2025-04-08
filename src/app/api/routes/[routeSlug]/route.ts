import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// Most basic route handler with minimal type requirements
export async function GET(req: Request, context: any) {
  // Extract params safely
  const params = context.params || {};
  let { routeSlug } = params;
  
  try {
    // Validate route slug
    if (!routeSlug) {
      return NextResponse.json(
        { error: 'Route slug is required' },
        { status: 400 }
      );
    }
    
    console.log(`Original route slug from URL: ${routeSlug}`);
    
    // Check if we're on Netlify by looking at the URL or host header
    const isNetlify = process.env.NETLIFY === 'true' || 
                     req.headers.get('host')?.includes('netlify');
    
    // Enhanced URL handling for both old and new URL formats
    if (routeSlug.includes('-to-')) {
      // Parse basic route format from any URL pattern
      const parts = routeSlug.split('-to-');
      if (parts.length === 2) {
        console.log(`Processing route with parts: ${parts[0]} to ${parts[1]}`);
        
        // Try to find exact match first
        const exactMatch = await prisma.route.findUnique({
          where: { routeSlug },
          select: { id: true }
        });
        
        if (exactMatch) {
          console.log(`Found exact match for route slug: ${routeSlug}`);
        } else {
          console.log(`No exact match found, searching by city combinations`);
          
          // Get all cities to identify matches in the slugs (simplified query to avoid schema issues)
          const allCities = await prisma.city.findMany({
            select: { 
              id: true,
              slug: true, 
              name: true
            }
          });
          
          // First try to find cities that could match the departures and destinations
          const possibleDepartureCities = allCities.filter(city => 
            parts[0].includes(city.slug) || 
            parts[0].toLowerCase().includes(city.name.toLowerCase())
          );
          
          const possibleDestinationCities = allCities.filter(city => 
            parts[1].includes(city.slug) || 
            parts[1].toLowerCase().includes(city.name.toLowerCase())
          );
          
          console.log(`Found ${possibleDepartureCities.length} possible departure cities and ${possibleDestinationCities.length} possible destination cities`);
          
          // Now look for routes between any of these cities
          let foundRoute = false;
          
          for (const depCity of possibleDepartureCities) {
            for (const destCity of possibleDestinationCities) {
              // Check if there's a route between these cities
              const routeMatch = await prisma.route.findFirst({
                where: {
                  departureCity: { slug: depCity.slug },
                  destinationCity: { slug: destCity.slug }
                },
                select: { routeSlug: true }
              });
              
              if (routeMatch) {
                console.log(`Found matching route: ${routeMatch.routeSlug}`);
                routeSlug = routeMatch.routeSlug;
                foundRoute = true;
                break;
              }
            }
            if (foundRoute) break;
          }
          
          // If we still don't have a match, try a basic URL cleanup approach
          if (!foundRoute) {
            // Remove any country name patterns to simplify the slug
            const basicDepartureSlug = parts[0].replace(/-costa-rica/g, '')
                                           .replace(/-nicaragua/g, '')
                                           .replace(/-honduras/g, '');
            const basicDestinationSlug = parts[1].replace(/-costa-rica/g, '')
                                               .replace(/-nicaragua/g, '')
                                               .replace(/-honduras/g, '');
            
            const cleanRouteSlug = `${basicDepartureSlug}-to-${basicDestinationSlug}`;
            
            console.log(`Trying simplified slug: ${cleanRouteSlug}`);
            
            // Try finding a route with the cleaned slug
            const cleanMatch = await prisma.route.findFirst({
              where: {
                routeSlug: {
                  contains: cleanRouteSlug,
                  mode: 'insensitive'
                }
              },
              select: { routeSlug: true }
            });
            
            if (cleanMatch) {
              console.log(`Found match with simplified slug: ${cleanMatch.routeSlug}`);
              routeSlug = cleanMatch.routeSlug;
            }
          }
        }
      }
    }
    
    console.log(`[DEBUG] Final route slug for database lookup: ${routeSlug}`); // Added DEBUG prefix

    const route = await prisma.route.findUnique({
      where: { routeSlug },
      select: {
        routeSlug: true,
        displayName: true,
        viatorWidgetCode: true,
        seoDescription: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        createdAt: true,
        updatedAt: true,
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
        amenities: {
          select: {
            name: true
            // icon: true // Removed as 'icon' does not exist on Amenity model
          }
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
