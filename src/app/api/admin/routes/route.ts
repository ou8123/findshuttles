import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Import your auth options
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma types for validation/error handling

// Define expected shape of the request body for POST
interface NewRouteData {
  departureCityId: string;
  destinationCityId: string;
  viatorWidgetCode: string;
  seoDescription?: string;
  // Add other fields as needed
}

// --- GET Handler ---
export async function GET(_request: Request) { // Prefix unused parameter with _
  // 1. Check Authentication and Authorization
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Admin Route GET: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch Routes from Database
  try {
    const routes = await prisma.route.findMany({
      include: {
        departureCity: { select: { name: true } },      // Include departure city name
        destinationCity: { select: { name: true } },    // Include destination city name
        departureCountry: { select: { name: true } },   // Include departure country name
        destinationCountry: { select: { name: true } }, // Include destination country name
      },
      orderBy: {
        // Optional: Order routes, e.g., by creation date or slug
        createdAt: 'desc',
      }
    });

    console.log(`Admin Route GET: Fetched ${routes.length} routes for user ${session.user?.email}`);

    // 3. Return Success Response
    return NextResponse.json(routes, { status: 200 });

  } catch (error) {
    console.error("Admin Route GET: Error fetching routes.", error);
    // Generic server error
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

// --- POST Handler ---
interface NewRouteData {
  departureCityId: string;
  destinationCityId: string;
  viatorWidgetCode: string;
  seoDescription?: string;
  // Add other fields as needed
}

export async function POST(request: Request) {
  // 1. Check Authentication and Authorization
  const session = await getServerSession(authOptions);

  // Use type assertion or check if user exists and has role
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Admin Route POST: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Request Body
  let data: NewRouteData;
  try {
    data = await request.json();
  } catch (error) {
    console.error("Admin Route POST: Invalid JSON body.", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Validate Incoming Data (Basic)
  if (!data.departureCityId || !data.destinationCityId || !data.viatorWidgetCode) {
    return NextResponse.json(
      { error: 'Missing required fields: departureCityId, destinationCityId, viatorWidgetCode' },
      { status: 400 }
    );
  }

  // 4. Create Route using Prisma
  try {
    // Fetch city slugs and country IDs for denormalization and routeSlug creation
    const departureCity = await prisma.city.findUnique({
        where: { id: data.departureCityId },
        select: { slug: true, countryId: true }
    });
    const destinationCity = await prisma.city.findUnique({
        where: { id: data.destinationCityId },
        select: { slug: true, countryId: true }
    });

    if (!departureCity || !destinationCity) {
        return NextResponse.json({ error: 'Invalid departure or destination city ID' }, { status: 400 });
    }

    const routeSlug = `${departureCity.slug}-to-${destinationCity.slug}`;

    const newRoute = await prisma.route.create({
      data: {
        departureCityId: data.departureCityId,
        destinationCityId: data.destinationCityId,
        departureCountryId: departureCity.countryId, // Denormalized
        destinationCountryId: destinationCity.countryId, // Denormalized
        routeSlug: routeSlug,
        viatorWidgetCode: data.viatorWidgetCode,
        seoDescription: data.seoDescription, // Optional
      },
    });

    console.log(`Admin Route POST: Successfully created route ${newRoute.routeSlug} by user ${session.user?.email}`);

    // TODO: Implement revalidation for the created route page
    // Example: revalidatePath(`/routes/${newRoute.routeSlug}`);

    // 5. Return Success Response
    return NextResponse.json(newRoute, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Admin Route POST: Error creating route.", error);

    // Handle potential unique constraint violation (e.g., routeSlug already exists)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A route with this departure and destination already exists.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    );
  }
}

// You might add GET, PUT, DELETE handlers here later for full CRUD