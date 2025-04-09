import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Using shared authOptions
import slugify from 'slugify';
import { Prisma } from '@prisma/client'; // Import Prisma
// Remove unused import: import { matchAmenities } from '@/lib/amenity-matcher';
import { getSuggestedWaypoints, WaypointStop } from '@/lib/aiWaypoints'; // Import the waypoint generator and type

// Helper function to generate a unique slug
async function generateUniqueSlug(departureCitySlug: string, destinationCitySlug: string): Promise<string> { // Corrected param names
  const baseSlug = slugify(`${departureCitySlug}-to-${destinationCitySlug}`, { lower: true, strict: true });
  let uniqueSlug = baseSlug;
  let counter = 1;

  // Check if the slug already exists
  while (await prisma.route.findUnique({ where: { routeSlug: uniqueSlug } })) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
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


export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Add detailed logging for the session object
  console.log("[API POST /api/admin/routes] Session Check:", JSON.stringify(session, null, 2)); 

  // Corrected role check (case-insensitive)
  if (session?.user?.role?.toLowerCase() !== 'admin') { 
    console.error("[API POST /api/admin/routes] Unauthorized access attempt. Session:", JSON.stringify(session, null, 2));
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[API POST /api/admin/routes] Authorized user: ${session.user.email}, Role: ${session.user.role}`);

  try {
    const body = await request.json();
    const { 
      departureCityId, 
      destinationCityId, 
      viatorWidgetCode,
      metaTitle,
      metaDescription,
      metaKeywords,
      seoDescription,
      travelTime, 
      otherStops, 
      isAirportPickup, // Expect boolean
      isAirportDropoff, // Expect boolean
      isCityToCity, // Expect boolean
      isPrivateDriver, // New flag
      isSightseeingShuttle, // New flag
      mapWaypoints: manualMapWaypoints, // Check for manually provided waypoints
      selectedAmenityIds // Expect selectedAmenityIds from the form
    } = body;

    // Basic validation
    if (!departureCityId || !destinationCityId || !viatorWidgetCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Allow same departure/destination only for specific types
    if (departureCityId === destinationCityId && !isPrivateDriver && !isSightseeingShuttle) {
        return NextResponse.json({ error: 'Departure and destination cities cannot be the same for this route type.' }, { status: 400 });
    }
     // Validate boolean flags (ensure they are actually booleans if provided)
     const booleanFlags = [isAirportPickup, isAirportDropoff, isCityToCity, isPrivateDriver, isSightseeingShuttle];
     if (booleanFlags.some(flag => flag !== undefined && typeof flag !== 'boolean')) {
       return NextResponse.json({ error: 'Invalid type for route type flags.' }, { status: 400 });
     }


    // Fetch city and country details to generate slug and display name
    const departureCity = await prisma.city.findUnique({
      where: { id: departureCityId },
      include: { country: true }
    });
    const destinationCity = await prisma.city.findUnique({
      where: { id: destinationCityId },
      include: { country: true }
    });

    if (!departureCity || !destinationCity) {
      return NextResponse.json({ error: 'Invalid city ID provided' }, { status: 400 });
    }

    // Generate unique slug using city slugs
    const routeSlug = await generateUniqueSlug(departureCity.slug, destinationCity.slug);
    
    // Generate default display name
    const displayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}`;

    // --- Logic to ensure only one route type flag is true ---
    let finalIsAirportPickup = isAirportPickup === true;
    let finalIsAirportDropoff = isAirportDropoff === true;
    let finalIsCityToCity = isCityToCity === true;
    let finalIsPrivateDriver = isPrivateDriver === true;
    let finalIsSightseeingShuttle = isSightseeingShuttle === true;

    const trueFlags = [
        finalIsAirportPickup, 
        finalIsAirportDropoff, 
        finalIsCityToCity, 
        finalIsPrivateDriver, 
        finalIsSightseeingShuttle
    ].filter(Boolean).length;

    if (trueFlags > 1) {
        // If multiple flags are true, prioritize (e.g., Airport > Private > Sightseeing > City) or default to CityToCity
        console.warn("Multiple route type flags were true. Prioritizing or defaulting to CityToCity.");
        finalIsAirportPickup = false; // Reset all
        finalIsAirportDropoff = false;
        finalIsPrivateDriver = false;
        finalIsSightseeingShuttle = false;
        finalIsCityToCity = true; // Default
        // Add more sophisticated prioritization logic here if needed
    } else if (trueFlags === 0) {
        // If no flag is explicitly true, default to CityToCity
        console.warn("No route type flag was true. Defaulting to CityToCity.");
        finalIsCityToCity = true;
        // Ensure others are false if defaulting
        finalIsAirportPickup = false;
        finalIsAirportDropoff = false;
        finalIsPrivateDriver = false;
        finalIsSightseeingShuttle = false;
    }
    // --- End route type flag logic ---

    // --- Waypoint Logic: Use manual if provided, otherwise generate ---
    let finalMapWaypoints: Prisma.JsonValue | null = null;

    if (manualMapWaypoints && Array.isArray(manualMapWaypoints) && manualMapWaypoints.length > 0) {
        // Basic validation for manually provided waypoints (assuming WaypointStop structure: {name, lat, lng})
        const isValidManual = manualMapWaypoints.every(
            (wp: any) => typeof wp === 'object' && wp !== null && 
                         typeof wp.name === 'string' && 
                         typeof wp.lat === 'number' && 
                         typeof wp.lng === 'number'
        );
        if (isValidManual) {
            console.log("Using manually provided mapWaypoints.");
            finalMapWaypoints = manualMapWaypoints as Prisma.JsonValue;
        } else {
            console.warn("Manual mapWaypoints provided but format is invalid (expected {name, lat, lng}). Ignoring.");
            // Optionally return an error here if invalid format is critical
            // return NextResponse.json({ error: 'Invalid format for provided mapWaypoints' }, { status: 400 });
        }
    } else if ((finalIsPrivateDriver || finalIsSightseeingShuttle) && departureCity?.name) {
        // Only generate if not manually provided and route type is relevant
        const estimatedDurationMinutes = parseDurationMinutes(travelTime); // Use helper function
        if (estimatedDurationMinutes > 0) {
            // Ensure country name is available before calling
            const departureCountryName = departureCity.country?.name;
            if (!departureCountryName) {
                 console.error("Cannot generate waypoints: Departure country name is missing.");
            } else {
                 console.log(`No manual waypoints provided. Attempting to generate waypoints for ${departureCity.name}, ${departureCountryName}, duration: ${estimatedDurationMinutes} mins`);
                 try {
                     const waypointsArray: WaypointStop[] = await getSuggestedWaypoints({
                         city: departureCity.name,
                         country: departureCountryName, // Pass the country name
                         durationMinutes: estimatedDurationMinutes,
                     });
                     if (waypointsArray.length > 0) {
                         finalMapWaypoints = waypointsArray as Prisma.JsonValue;
                         console.log("Generated waypoints:", finalMapWaypoints);
                     } else {
                         console.log("Waypoint generation returned empty array.");
                     }
                 } catch (waypointError) {
                     console.error("Error generating waypoints:", waypointError);
                     // Decide if this error should prevent route creation or just log
                 }
            }
        } else {
             console.log("Skipping waypoint generation due to zero or invalid duration.");
        }
    }
    // --- End waypoint logic ---


    // Prepare data for creation, using correct connect syntax for relations
    const routeCreateData = {
        departureCity: { connect: { id: departureCityId } }, // Corrected
        departureCountry: { connect: { id: departureCity.countryId } }, // Corrected
        destinationCity: { connect: { id: destinationCityId } }, // Corrected
        destinationCountry: { connect: { id: destinationCity.countryId } }, // Corrected
        routeSlug,
        displayName, // Use generated display name
        viatorWidgetCode,
        metaTitle: metaTitle || `Shuttle from ${departureCity.name} to ${destinationCity.name}`, // Default meta title
        metaDescription: metaDescription || `Book reliable shuttle transport from ${departureCity.name}, ${departureCity.country.name} to ${destinationCity.name}, ${destinationCity.country.name}.`, // Default meta description
        metaKeywords: metaKeywords || `${departureCity.name} shuttle, ${destinationCity.name} shuttle, ${departureCity.country.name} transport, ${destinationCity.country.name} transport`, // Default keywords
        seoDescription: seoDescription || null, // Allow null
        travelTime: travelTime || null, // Save travelTime
        otherStops: otherStops || null, // Save otherStops
        // Use the validated/corrected flags
        isAirportPickup: finalIsAirportPickup,
        isAirportDropoff: finalIsAirportDropoff,
        isCityToCity: finalIsCityToCity,
        isPrivateDriver: finalIsPrivateDriver,
        isSightseeingShuttle: finalIsSightseeingShuttle,
        mapWaypoints: finalMapWaypoints, // Use the final waypoints (manual or generated)
        // Connect amenities based on the selected IDs from the form
        amenities: {
          connect: selectedAmenityIds && Array.isArray(selectedAmenityIds) && selectedAmenityIds.length > 0 
                   ? selectedAmenityIds.map((id: string) => ({ id })) 
                   : [], // Connect empty array if none selected
        },
    };

    const newRoute = await prisma.route.create({
      data: routeCreateData as any, // Use 'as any' to bypass strict check for mapWaypoints if needed
      // Include amenities in the returned object to confirm association
      include: {
        amenities: true, 
      }
    });

    // Explicitly check if amenities exist on the returned object before logging length
    // Add type assertion to help TS recognize the included relation
    const routeWithAmenities = newRoute as typeof newRoute & { amenities: { id: string }[] };
    const amenityCount = routeWithAmenities.amenities ? routeWithAmenities.amenities.length : 0;
    console.log(`[API POST /api/admin/routes] Route created successfully: ${newRoute.id} with ${amenityCount} amenities associated.`);
    
    return NextResponse.json(newRoute, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/admin/routes] Failed to create route:", error);
     // Check for specific Prisma errors if needed
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
         // Handle unique constraint violation, e.g., for routeSlug if generation logic fails somehow
         return NextResponse.json({ error: 'An operation failed because it depends on one or more records that were required but not found. Expected records to be connected, found only 0.' }, { status: 409 });
     }
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
         // Handle unique constraint violation, e.g., for routeSlug if generation logic fails somehow
         return NextResponse.json({ error: 'A route with this slug might already exist.' }, { status: 409 });
     }
    return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { 
    // Get query parameters for pagination and search
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25'); // Default limit
    const search = searchParams.get('search');
    const skip = (page - 1) * limit;

    // Build the where clause for filtering
    let whereClause: Prisma.RouteWhereInput = {};
    if (search) {
      whereClause = {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { routeSlug: { contains: search, mode: 'insensitive' } },
          { departureCity: { name: { contains: search, mode: 'insensitive' } } },
          { destinationCity: { name: { contains: search, mode: 'insensitive' } } },
          { departureCountry: { name: { contains: search, mode: 'insensitive' } } },
          { destinationCountry: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }
    
    try {
        // Fetch total count first for pagination calculation
        const totalItems = await prisma.route.count({ where: whereClause });
        const totalPages = Math.ceil(totalItems / limit);
        const hasMore = page < totalPages;

        // Fetch the paginated and sorted routes
        const routes = await prisma.route.findMany({
            where: whereClause, // Apply the filter
            include: {
                departureCity: {
                    select: { name: true, id: true } 
                },
                destinationCity: {
                    select: { name: true, id: true } 
                },
                departureCountry: { 
                    select: { name: true } 
                }, 
                destinationCountry: { 
                     select: { name: true } 
                 },
             },
             orderBy: {
                  createdAt: 'desc' // Sort by creation date, newest first
             },
             skip: skip,
             take: limit,
         });

         // Construct pagination object
         const pagination = {
             page,
             limit,
             totalItems,
             totalPages,
             hasMore
         };

        // Return data in the expected format for the frontend
        return NextResponse.json({ routes, pagination }); 
    } catch (error) {
        console.error("Failed to fetch routes:", error);
        return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
    }
}
