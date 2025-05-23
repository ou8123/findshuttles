import { NextResponse } from 'next/server'; // Revert back to not importing NextRequest
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import slugify from 'slugify'; // Import slugify
// Remove unused import: import { matchAmenities } from '@/lib/amenity-matcher'; 
import { getSuggestedWaypoints, WaypointStop } from '@/lib/aiWaypoints'; // Import the waypoint generator and type

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
  additionalInstructions: true,
  travelTime: true, 
  otherStops: true, 
  isAirportPickup: true, 
  isAirportDropoff: true, 
  isCityToCity: true, 
  isPrivateDriver: true, 
  isSightseeingShuttle: true, 
  mapWaypoints: true, // Select the waypoints field
  possibleNearbyStops: true, // Select the nearby stops field
  viatorDestinationLink: true, // ✅ Select the Viator link field
  amenities: { select: { id: true, name: true } }, // Include amenities here
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

// Updated interface to include new flags and additional instructions
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
  additionalInstructions?: string | null;
  // Add the new flags here
  isAirportPickup?: boolean;
  isAirportDropoff?: boolean;
  isCityToCity?: boolean;
  isPrivateDriver?: boolean; 
  isSightseeingShuttle?: boolean; 
  mapWaypoints?: Prisma.JsonValue | null; // Add mapWaypoints to allow manual override/clearing
  possibleNearbyStops?: Prisma.JsonValue | null; // Add possibleNearbyStops field
  viatorDestinationLink?: string | null; // ✅ Add Viator link field
  selectedAmenityIds?: string[]; // Add selectedAmenityIds
}

// Helper function to parse duration from travelTime string
function parseDurationMinutes(travelTime: string | null | undefined): number {
    if (!travelTime) return 240; // Default to 4 hours (240 mins) if not provided
    const match = travelTime.match(/(\d+(\.\d+)?)/); // Find the first number (integer or decimal)
    if (match && match[1]) {
        const hours = parseFloat(match[1]);
        if (!isNaN(hours)) {
            return Math.round(hours * 60); // Convert hours to minutes
        }
    }
    return 240; // Default if parsing fails
}
 
 export async function PUT(request: Request, { params }: { params: { routeId: string } }) { // Revert to Request
  const session = await getServerSession(authOptions);
  // Ensure user is admin - corrected role check (case-insensitive)
  if (session?.user?.role?.toLowerCase() !== 'admin') { 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params; // Now this is fine
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
  
  // Allow same departure/destination only for specific types
  // Use the boolean flags directly from the request body 'data'
  const isPrivate = data.isPrivateDriver === true;
  const isSightseeing = data.isSightseeingShuttle === true;
  if (data.departureCityId === data.destinationCityId && !isPrivate && !isSightseeing) {
    return NextResponse.json({ error: 'Departure and destination cities cannot be the same for this route type.' }, { status: 400 });
  }

  try {
    // Fetch the current route data including fields needed for waypoint logic
    const currentRoute = await prisma.route.findUnique({
        where: { id: routeId },
        select: { 
            mapWaypoints: true, 
            departureCity: { select: { name: true, country: { select: { name: true } } } }, // Select country name here
            travelTime: true 
        } 
    });

    if (!currentRoute) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

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
    const routeSlug = data.routeSlug || slugify(`${departureCity.slug}-to-${destinationCity.slug}`, { lower: true, strict: true });
    
    // Use provided display name or generate one with proper country format
    let displayName;
    if (data.displayName) {
      displayName = data.displayName;
    } else {
      if (departureCity.country.name === destinationCity.country.name) {
        displayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}, ${departureCity.country.name}`;
      } else {
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

    // --- Generate/Handle waypoints if applicable ---
    let waypointsToSave: Prisma.JsonValue | null = null; // Initialize to null

    // Determine if manual waypoints were provided and are valid
    let manualWaypointsProvided = false;
    let validManualWaypoints: Prisma.JsonValue | null = null;
    if (data.mapWaypoints !== undefined && data.mapWaypoints !== null) {
        if (Array.isArray(data.mapWaypoints) && data.mapWaypoints.length > 0) {
            const isValidManual = data.mapWaypoints.every(
                (wp: any) => typeof wp === 'object' && wp !== null &&
                             typeof wp.name === 'string' &&
                             typeof wp.lat === 'number' &&
                             typeof wp.lng === 'number'
            );
            if (isValidManual) {
                manualWaypointsProvided = true;
                validManualWaypoints = data.mapWaypoints as Prisma.JsonValue;
                console.log("Valid manual mapWaypoints provided:", validManualWaypoints);
            } else {
                console.warn("Manual mapWaypoints provided but format is invalid (expected {name, lat, lng}). Ignoring.");
                // Keep waypointsToSave as null
            }
        } else if (Array.isArray(data.mapWaypoints) && data.mapWaypoints.length === 0) {
             // Explicitly empty array provided - treat as manual instruction to have no waypoints
             manualWaypointsProvided = true;
             validManualWaypoints = null; // Represent empty/null with standard null
             console.log("Manual empty mapWaypoints array provided.");
        }
        // If data.mapWaypoints was null, manualWaypointsProvided remains false
    }


    // Generate waypoints ONLY if it's a tour type AND valid manual waypoints were NOT provided
    const shouldGenerateWaypoints = (isPrivate || isSightseeing) && !manualWaypointsProvided;

    if (shouldGenerateWaypoints) {
        console.log("Attempting to generate waypoints because route is tour type and no valid manual waypoints were provided.");
        const estimatedDurationMinutes = parseDurationMinutes(data.travelTime || currentRoute.travelTime);
        const departureCityNameForGen = departureCity?.name;
        const departureCountryNameForGen = departureCity?.country?.name;

        if (departureCityNameForGen && departureCountryNameForGen && estimatedDurationMinutes > 0) {
            console.log(`[Waypoint Gen Call Debug] Calling getSuggestedWaypoints with: city=${departureCityNameForGen}, country=${departureCountryNameForGen}, duration=${estimatedDurationMinutes}`);
            try {
                const waypointsArray: WaypointStop[] = await getSuggestedWaypoints({
                    city: departureCityNameForGen,
                    country: departureCountryNameForGen,
                    durationMinutes: estimatedDurationMinutes,
                });
                if (waypointsArray.length > 0) {
                    waypointsToSave = waypointsArray as Prisma.JsonValue;
                    console.log("Generated waypoints:", waypointsToSave);
                } else {
                    waypointsToSave = null; // Use standard null if generation returns empty
                    console.log("Waypoint generation returned empty array, setting to null.");
                }
            } catch (waypointError) {
                 console.error("Error generating waypoints:", waypointError);
                 waypointsToSave = null; // Ensure null on error
            }
        } else {
             console.log("Skipping waypoint generation: Missing city/country name or invalid duration.");
             waypointsToSave = null; // Ensure null if conditions not met
        }
    } else if (manualWaypointsProvided) {
        // Use the validated manual waypoints (could be data or null for empty array)
        console.log("Using manually provided waypoints (or explicit empty array/null).");
        waypointsToSave = validManualWaypoints;
    } else {
        // Not a tour type and no manual waypoints provided, ensure it's null
        console.log("Not a tour type and no manual waypoints provided. Setting waypoints to null.");
        waypointsToSave = null; // Explicitly null for non-tour types without manual input
    }
    // --- End waypoint handling ---

    // Prepare data for update, including new flags and potentially generated waypoints
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
      additionalInstructions: data.additionalInstructions || null,
      travelTime: data.travelTime || null,
      otherStops: data.otherStops || null,
      isAirportPickup: data.isAirportPickup ?? false,
      isAirportDropoff: data.isAirportDropoff ?? false,
      isCityToCity: data.isCityToCity ?? true, // Consider refining default based on other flags
      isPrivateDriver: data.isPrivateDriver ?? false, 
      isSightseeingShuttle: data.isSightseeingShuttle ?? false, 
      viatorDestinationLink: data.viatorDestinationLink || null, // ✅ Include Viator link in update data
      // Use Prisma.DbNull for null, and cast to InputJsonValue otherwise
      // Corrected: Use Prisma.DbNull only when saving null to the DB
      mapWaypoints: waypointsToSave === null ? Prisma.DbNull : (waypointsToSave as Prisma.InputJsonValue),
      possibleNearbyStops: data.possibleNearbyStops === null ? Prisma.DbNull : 
                         (Array.isArray(data.possibleNearbyStops) && data.possibleNearbyStops.length === 0) ? Prisma.DbNull : 
                         (data.possibleNearbyStops as Prisma.InputJsonValue),
      amenities: {
        // Use 'set' to replace existing amenities with the new selection from the form
        set: data.selectedAmenityIds ? data.selectedAmenityIds.map((id: string) => ({ id })) : [],
      },
    };


    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: updateData, // Type should be correct now
      select: { // Ensure amenities are selected in the response
        ...routeSelect, // Includes mapWaypoints now
        amenities: { select: { id: true, name: true } }, // Select amenity details
      }
    });

    console.log(`Admin Route PUT: Successfully updated route ${updatedRoute.id} by user ${session.user?.email}`);
    // Return the updated route data with the selected fields
    return NextResponse.json(updatedRoute);

  } catch (error) {
    console.error(`Admin Route PUT Error (ID: ${routeId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Record not found for update
      if (error.code === 'P2025') {
         // Log more details for P2025 specifically
         console.error(`Prisma P2025 Error Details: Target - ${error.meta?.target}, Cause - ${error.meta?.cause}`);
         // Provide a more specific error message if possible, otherwise keep generic
         return NextResponse.json({ error: 'Route or a related record (like an Amenity) not found during update.' }, { status: 404 });
      }
       // Unique constraint violation (e.g., routeSlug)
       if (error.code === 'P2002') {
         return NextResponse.json({ error: 'A route with this slug might already exist.' }, { status: 409 });
       }
    }
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: { routeId: string } }) { // Revert to Request
  const session = await getServerSession(authOptions);
  // Corrected role check (case-insensitive)
  if (session?.user?.role?.toLowerCase() !== 'admin') { 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params; // Now this is fine

  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      // Use the common select object
      // Ensure amenities are included in the GET response as well
      select: {
        ...routeSelect, // Includes mapWaypoints now
        amenities: true, // Ensure amenities are selected
      }
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

export async function DELETE(request: Request, { params }: { params: { routeId: string } }) { // Revert to Request
  const session = await getServerSession(authOptions);
   // Corrected role check (case-insensitive)
   if (session?.user?.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params; // Now this is fine

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
