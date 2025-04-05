import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Using shared authOptions
import slugify from 'slugify';
import { Prisma } from '@prisma/client'; // Import Prisma

// Helper function to generate a unique slug
async function generateUniqueSlug(departureCityName: string, destinationCityName: string): Promise<string> {
  const baseSlug = slugify(`${departureCityName}-to-${destinationCityName}`, { lower: true, strict: true });
  let uniqueSlug = baseSlug;
  let counter = 1;

  // Check if the slug already exists
  while (await prisma.route.findUnique({ where: { routeSlug: uniqueSlug } })) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
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
      isCityToCity // Expect boolean
    } = body;

    // Basic validation
    if (!departureCityId || !destinationCityId || !viatorWidgetCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (departureCityId === destinationCityId) {
        return NextResponse.json({ error: 'Departure and destination cities cannot be the same.' }, { status: 400 });
    }
     // Validate boolean flags (ensure they are actually booleans if provided)
     if ((isAirportPickup !== undefined && typeof isAirportPickup !== 'boolean') ||
         (isAirportDropoff !== undefined && typeof isAirportDropoff !== 'boolean') ||
         (isCityToCity !== undefined && typeof isCityToCity !== 'boolean')) {
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

    // Generate unique slug
    const routeSlug = await generateUniqueSlug(departureCity.slug, destinationCity.slug);
    
    // Generate default display name
    const displayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}`;

    // Ensure only one flag is true, default to cityToCity if none are explicitly true
    let finalIsAirportPickup = isAirportPickup === true;
    let finalIsAirportDropoff = isAirportDropoff === true;
    let finalIsCityToCity = isCityToCity === true;

    if (finalIsAirportPickup && finalIsAirportDropoff) {
        // Invalid state, default to cityToCity or handle as error
        console.warn("Both airport pickup and dropoff flags were true, defaulting to cityToCity");
        finalIsAirportPickup = false;
        finalIsAirportDropoff = false;
        finalIsCityToCity = true;
    } else if (finalIsAirportPickup) {
        finalIsCityToCity = false;
        finalIsAirportDropoff = false;
    } else if (finalIsAirportDropoff) {
        finalIsCityToCity = false;
        finalIsAirportPickup = false;
    } else {
        // If neither airport flag is true, ensure cityToCity is true
        finalIsCityToCity = true; 
        finalIsAirportPickup = false;
        finalIsAirportDropoff = false;
    }


    const newRoute = await prisma.route.create({
      data: {
        departureCityId,
        departureCountryId: departureCity.countryId,
        destinationCityId,
        destinationCountryId: destinationCity.countryId,
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
      },
    });

    console.log(`[API POST /api/admin/routes] Route created successfully: ${newRoute.id}`);
    return NextResponse.json(newRoute, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/admin/routes] Failed to create route:", error);
     // Check for specific Prisma errors if needed
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
         // Handle unique constraint violation, e.g., for routeSlug if generation logic fails somehow
         return NextResponse.json({ error: 'A route with this slug might already exist.' }, { status: 409 });
     }
    return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { // Use NextRequest to access searchParams
    // No session check needed for public GET? Re-add if admin only.
    // const session = await getServerSession(authOptions);
    // if (session?.user?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get search query parameter
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    // Build the where clause for filtering
    let whereClause: Prisma.RouteWhereInput = {};
    if (search) {
      whereClause = {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { routeSlug: { contains: search, mode: 'insensitive' } },
          { departureCity: { name: { contains: search, mode: 'insensitive' } } },
          { destinationCity: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }
    
    try {
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
                 displayName: 'asc' 
            }
        });
        return NextResponse.json({ routes }); // Wrap in an object like { routes: [...] }
    } catch (error) {
        console.error("Failed to fetch routes:", error);
        return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
    }
}
