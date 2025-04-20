import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkApiAuth, RequiredRole } from '@/lib/api-auth';

export async function POST(
  request: Request,
  { params }: { params: { routeId: string } }
) {
  try {
    // 1. Verify user is admin
    const authResult = await checkApiAuth(request, RequiredRole.Admin);
    if (!authResult.authenticated) {
      return authResult.response; // Return error response if not authenticated/authorized
    }

    const { routeId } = params;

    if (!routeId) {
      return NextResponse.json(
        { error: 'Route ID is required' },
        { status: 400 }
      );
    }

    // 2. Fetch the original route and its relations (IDs only)
    const originalRoute = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        amenities: { select: { id: true } },
        hotelsServed: { select: { id: true } },
      },
    });

    if (!originalRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // 3. Generate a unique routeSlug
    let newSlug = `${originalRoute.routeSlug}-copy`;
    let counter = 1;
    let slugExists = await prisma.route.findUnique({ where: { routeSlug: newSlug } });
    while (slugExists) {
      counter++;
      newSlug = `${originalRoute.routeSlug}-copy-${counter}`;
      slugExists = await prisma.route.findUnique({ where: { routeSlug: newSlug } });
    }

    // 4. Generate a new displayName
    const newDisplayName = `${originalRoute.displayName} (Copy)`;

    // 5. Create the new route
    const newRoute = await prisma.route.create({
      data: {
        // Copy direct fields
        departureCityId: originalRoute.departureCityId,
        departureCountryId: originalRoute.departureCountryId,
        destinationCityId: originalRoute.destinationCityId,
        destinationCountryId: originalRoute.destinationCountryId,
        viatorWidgetCode: originalRoute.viatorWidgetCode,
        seoDescription: originalRoute.seoDescription,
        metaDescription: originalRoute.metaDescription,
        metaKeywords: originalRoute.metaKeywords,
        metaTitle: originalRoute.metaTitle,
        otherStops: originalRoute.otherStops,
        travelTime: originalRoute.travelTime,
        isAirportDropoff: originalRoute.isAirportDropoff,
        isAirportPickup: originalRoute.isAirportPickup,
        isCityToCity: originalRoute.isCityToCity,
        additionalInstructions: originalRoute.additionalInstructions,
        isPrivateDriver: originalRoute.isPrivateDriver,
        isSightseeingShuttle: originalRoute.isSightseeingShuttle,
        mapWaypoints: originalRoute.mapWaypoints ?? undefined, // Handle potential null
        possibleNearbyStops: originalRoute.possibleNearbyStops ?? undefined, // Handle potential null
        viatorDestinationLink: originalRoute.viatorDestinationLink,

        // Use generated unique fields
        routeSlug: newSlug,
        displayName: newDisplayName,

        // Connect relations using IDs
        amenities: {
          connect: originalRoute.amenities.map((amenity) => ({ id: amenity.id })),
        },
        hotelsServed: {
          connect: originalRoute.hotelsServed.map((hotel) => ({ id: hotel.id })),
        },
      },
    });

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'Route duplicated successfully',
      newRouteId: newRoute.id,
      newRouteSlug: newRoute.routeSlug,
    });
  } catch (error) {
    console.error('Error duplicating route:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate route', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
