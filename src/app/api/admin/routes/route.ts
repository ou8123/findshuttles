import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Force dynamic rendering and prevent caching
export const dynamic = 'force-dynamic';

interface NewRouteData {
  departureCityId: string;
  destinationCityId: string;
  viatorWidgetCode: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  seoDescription?: string | null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Admin Route GET: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse URL query parameters
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '25');
  const search = url.searchParams.get('search') || '';
  
  // Validate pagination parameters
  const validPage = page > 0 ? page : 1;
  const validLimit = limit > 0 && limit <= 100 ? limit : 25;
  const skip = (validPage - 1) * validLimit;

  try {
    // Build the where clause based on search term
    let where = {};
    if (search) {
      where = {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { routeSlug: { contains: search, mode: 'insensitive' } },
          { departureCity: { name: { contains: search, mode: 'insensitive' } } },
          { destinationCity: { name: { contains: search, mode: 'insensitive' } } },
          { departureCountry: { name: { contains: search, mode: 'insensitive' } } },
          { destinationCountry: { name: { contains: search, mode: 'insensitive' } } },
        ]
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.route.count({ where });

    // Get paginated routes
    // Restore includes
    const routes = await prisma.route.findMany({
      where,
      include: {
        departureCity: { select: { name: true } },
        destinationCity: { select: { name: true } },
        departureCountry: { select: { name: true } },
        destinationCountry: { select: { name: true } },
      },
      orderBy: {
        createdAt: 'desc', // Revert to ordering by creation date
      },
      skip,
      take: validLimit,
    });

    console.log(`Admin Route GET: Fetched ${routes.length} routes (page ${validPage}, limit ${validLimit}) for user ${session.user?.email}`);

    // Detailed Log: Check if the specific route is present after fetch
    const specificRoute = routes.find(r => r.departureCity.name === 'San Jose' && r.destinationCity.name === 'Quepos');
    console.log(`Admin Route GET: Is 'San Jose to Quepos' route present in fetched data? ${specificRoute ? 'Yes (ID: ' + specificRoute.id + ')' : 'No'}`);
    // Log all fetched route display names for comparison
    console.log(`Admin Route GET: Fetched displayNames: ${routes.map(r => r.displayName).join(', ')}`);

    // Return routes with pagination metadata
    return NextResponse.json({
      routes,
      pagination: {
        page: validPage,
        limit: validLimit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / validLimit),
        hasMore: skip + routes.length < totalCount
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store', // Prevent caching of the list
      },
    });

  } catch (error) {
    console.error("Admin Route GET: Error fetching routes.", error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Admin Route POST: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: NewRouteData;
  try {
    data = await request.json();
  } catch (error) {
    console.error("Admin Route POST: Invalid JSON body.", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!data.departureCityId || !data.destinationCityId || !data.viatorWidgetCode) {
    return NextResponse.json(
      { error: 'Missing required fields: departureCityId, destinationCityId, viatorWidgetCode' },
      { status: 400 }
    );
  }

  try {
    // Log received IDs immediately after validation
    console.log(`Admin Route POST: Received Departure ID: ${data.departureCityId}, Destination ID: ${data.destinationCityId}`);

    const departureCity = await prisma.city.findUnique({
        where: { id: data.departureCityId },
        select: {
            name: true,
            slug: true,
            countryId: true,
            country: {
                select: { 
                  name: true,
                  slug: true 
                }
            }
        }
    });
    const destinationCity = await prisma.city.findUnique({
        where: { id: data.destinationCityId },
        select: {
            name: true,
            slug: true,
            countryId: true,
            country: {
                select: { 
                  name: true,
                  slug: true 
                }
            }
        }
    });

    if (!departureCity || !destinationCity) {
        return NextResponse.json({ error: 'Invalid departure/destination city ID' }, { status: 400 });
    }

    // Create route slug without special handling
    const routeSlug = `${departureCity.slug}-to-${destinationCity.slug}`;
    
    // Create display name with country format
    let displayName = '';
    
    // Check if both cities are in the same country
    if (departureCity.country.name === destinationCity.country.name) {
      // Same country format: "Shuttles from City1 to City2, Country"
      displayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}, ${departureCity.country.name}`;
    } else {
      // Different countries format: "Shuttles from City1, Country1 to City2, Country2"
      displayName = `Shuttles from ${departureCity.name}, ${departureCity.country.name} to ${destinationCity.name}, ${destinationCity.country.name}`;
    }

    // Log the exact IDs before attempting creation
    console.log(`POST /api/admin/routes: Attempting to create route with Departure ID: ${data.departureCityId}, Destination ID: ${data.destinationCityId}`);

    // Reverted: Removed explicit delete attempt before create

    console.log("POST /api/admin/routes: About to call prisma.route.create..."); // Log before create
    const newRoute = await prisma.route.create({
      data: {
        departureCityId: data.departureCityId, // Ensure this is the correct ID from the form/find-or-create
        destinationCityId: data.destinationCityId, // Ensure this is the correct ID from the form/find-or-create
        departureCountryId: departureCity.countryId,
        destinationCountryId: destinationCity.countryId,
        routeSlug: routeSlug,
        displayName: displayName,
        viatorWidgetCode: data.viatorWidgetCode,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        metaKeywords: data.metaKeywords || null,
        seoDescription: data.seoDescription || null,
      },
    });

    console.log(`Admin Route POST: Successfully created route ${newRoute.routeSlug} by user ${session.user?.email}`);
    return NextResponse.json(newRoute, { status: 201 });

  } catch (error) {
    console.error("POST /api/admin/routes: Error during route creation.", error); // Log the specific error

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Log details if it's the unique constraint error
      console.error(`POST /api/admin/routes: Prisma P2002 error details:`, error.meta);
      return NextResponse.json(
        { error: 'A route with this departure and destination already exists.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    );
  }
}
