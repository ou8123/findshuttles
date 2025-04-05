import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import slugify from 'slugify'; // Import slugify

export const runtime = 'nodejs';

// Common route selection fields for consistent data shape including new flags
const routeSelect = {
  id: true,
  departureCityId: true,
  destinationCityId: true,
  departureCountryId: true,
  destinationCountryId: true,
  routeSlug: true,
  displayName: true,
  viatorWidgetCode: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  seoDescription: true,
  travelTime: true, // Added
  otherStops: true, // Added
  isAirportPickup: true, // Added flag
  isAirportDropoff: true, // Added flag
  isCityToCity: true, // Added flag
  departureCity: {
    select: {
      id: true,
      name: true,
      slug: true,
      country: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  },
  destinationCity: {
    select: {
      id: true,
      name: true,
      slug: true,
      country: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  },
  departureCountry: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  destinationCountry: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  }
};

// Updated interface to include new flags
interface UpdateRouteData {
  departureCityId: string;
  destinationCityId: string;
  routeSlug?: string;
  displayName?: string;
  viatorWidgetCode: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  seoDescription?: string | null;
  travelTime?: string | null; 
  otherStops?: string | null; 
  // Add the new flags here (make them optional as they might not always be sent)
  isAirportPickup?: boolean;
  isAirportDropoff?: boolean;
  isCityToCity?: boolean;
}
 
 export async function PUT(request: Request, context: any) {
  const params = context.params as { routeId: string };
  const session = await getServerSession(authOptions);
  // Ensure user is admin - corrected role check (case-insensitive)
  if (session?.user?.role?.toLowerCase() !== 'admin') { 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params;
  let data: UpdateRouteData;

  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate required fields
  if (!data.departureCityId || !data.destinationCityId || !data.viatorWidgetCode) {
    return NextResponse.json(
      { error: 'Missing required fields: departureCityId, destinationCityId, viatorWidgetCode' },
      { status: 400 }
    );
  }
  if (data.departureCityId === data.destinationCityId) {
    return NextResponse.json({ error: 'Departure and destination cities cannot be the same.' }, { status: 400 });
  }

  try {
    // Fetch cities with their countries for validation
    const [departureCity, destinationCity] = await Promise.all([
      prisma.city.findUnique({
        where: { id: data.departureCityId },
        select: {
          id: true,
          name: true,
          slug: true,
          countryId: true,
          country: {
            select: { 
              id: true,
              name: true,
              slug: true 
            }
          }
        }
      }),
      prisma.city.findUnique({
        where: { id: data.destinationCityId },
        select: {
          id: true,
          name: true,
          slug: true,
          countryId: true,
          country: {
            select: { 
              id: true,
              name: true,
              slug: true 
            }
          }
        }
      })
    ]);

    if (!departureCity || !destinationCity) {
      return NextResponse.json({ error: 'Invalid departure or destination city ID' }, { status: 400 });
    }

    // Use provided slug or generate a default one if necessary
    // Ensure slugify is used correctly
    const routeSlug = data.routeSlug || slugify(`${departureCity.slug}-to-${destinationCity.slug}`, { lower: true, strict: true });
    
    // Use provided display name or generate one with proper country format
    let displayName;
    
    if (data.displayName) {
      // Use the custom display name from the form if provided
      displayName = data.displayName;
    } else {
      // Generate display name with country format
      if (departureCity.country.name === destinationCity.country.name) {
        // Same country format: "Shuttles from City1 to City2, Country"
        displayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}, ${departureCity.country.name}`;
      } else {
        // Different countries format: "Shuttles from City1, Country1 to City2, Country2"
        displayName = `Shuttles from ${departureCity.name}, ${departureCity.country.name} to ${destinationCity.name}, ${destinationCity.country.name}`;
      }
    }

    // Check if the route already exists with this slug, excluding the current route
    const existingRoute = await prisma.route.findFirst({
      where: {
        routeSlug: routeSlug,
        NOT: {
          id: routeId
        }
      }
    });

    if (existingRoute) {
      return NextResponse.json(
        { error: `A route with this URL slug already exists.` },
        { status: 409 }
      );
    }

    // Prepare data for update, including new flags
    const updateData: Prisma.RouteUpdateInput = {
      departureCity: { connect: { id: data.departureCityId } },
      destinationCity: { connect: { id: data.destinationCityId } },
      departureCountry: { connect: { id: departureCity.country.id } },
      destinationCountry: { connect: { id: destinationCity.country.id } },
      routeSlug: routeSlug,
      displayName: displayName,
      viatorWidgetCode: data.viatorWidgetCode,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      seoDescription: data.seoDescription || null,
      travelTime: data.travelTime || null, 
      otherStops: data.otherStops || null, 
      // Include flags in update data, using ?? for defaults if undefined
      isAirportPickup: data.isAirportPickup ?? false,
      isAirportDropoff: data.isAirportDropoff ?? false,
      isCityToCity: data.isCityToCity ?? true, // Default to true if others are false/undefined
    };
 
     const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: updateData as any, // Cast to any to bypass strict type check for new flags
      // Use the common select object for consistency
      select: routeSelect 
    });

    console.log(`Admin Route PUT: Successfully updated route ${updatedRoute.id} by user ${session.user?.email}`);
    // Return the updated route data with the selected fields
    return NextResponse.json(updatedRoute);

  } catch (error) {
    console.error(`Admin Route PUT Error (ID: ${routeId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Record not found for update
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
       // Unique constraint violation (e.g., routeSlug)
       if (error.code === 'P2002') {
         return NextResponse.json({ error: 'A route with this slug might already exist.' }, { status: 409 });
       }
    }
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
  }
}

export async function GET(request: Request, context: any) {
  const params = context.params as { routeId: string };
  const session = await getServerSession(authOptions);
  // Corrected role check (case-insensitive)
  if (session?.user?.role?.toLowerCase() !== 'admin') { 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params;

  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      // Use the common select object
      select: routeSelect 
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error(`Admin Route GET Error (ID: ${routeId}):`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch route',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  const params = context.params as { routeId: string };
  const session = await getServerSession(authOptions);
   // Corrected role check (case-insensitive)
   if (session?.user?.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params;

  try {
    // First check if the route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        departureCity: true,
        destinationCity: true
      }
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Delete the route
    await prisma.route.delete({
      where: { id: routeId },
    });

    console.log(`Admin Route DELETE: Successfully deleted route ${routeId} (${route.departureCity.name} to ${route.destinationCity.name}) by user ${session.user?.email}`);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`Admin Route DELETE Error (ID: ${routeId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
      if (error.code === 'P2003' || error.code === 'P2014') {
        return NextResponse.json(
          { error: 'Cannot delete route due to existing relations.' },
          { status: 409 }
        );
      }
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete route',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
