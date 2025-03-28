import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Removed unused local generateSlug function (assuming it's imported if needed elsewhere, or handled differently)

// Define the inner params type
type RouteParamsType = { routeId: string };

// Define expected shape of the request body for PUT
interface UpdateRouteData {
  departureCityId: string;
  destinationCityId: string;
  viatorWidgetCode: string;
  seoDescription?: string | null; // Allow null to clear
}


// PUT handler to update a specific route
export async function PUT(request: Request, context: { params: RouteParamsType }) {
  const { params } = context; // Extract params from context
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params;
  let data: UpdateRouteData;

  try {
    data = await request.json();
  } catch { // Removed unused error variable
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
    // Fetch city slugs and country IDs for potential update
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

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: {
        departureCityId: data.departureCityId,
        destinationCityId: data.destinationCityId,
        departureCountryId: departureCity.countryId, // Update denormalized
        destinationCountryId: destinationCity.countryId, // Update denormalized
        routeSlug: routeSlug, // Update slug
        viatorWidgetCode: data.viatorWidgetCode,
        seoDescription: data.seoDescription, // Handles null or string
      },
    });
    console.log(`Admin Route PUT: Successfully updated route ${updatedRoute.id} by user ${session.user?.email}`);
    return NextResponse.json(updatedRoute);

  } catch (error) {
    console.error(`Admin Route PUT Error (ID: ${routeId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (routeSlug)
      if (error.code === 'P2002') {
         const target = (error.meta?.target as string[])?.join(', ');
         return NextResponse.json(
           { error: `A route with this ${target} already exists.` },
           { status: 409 } // Conflict
         );
      }
      // Record not found for update
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
  }
}

// DELETE handler to delete a specific route
export async function DELETE(request: Request, context: { params: RouteParamsType }) { // Add request parameter back
  const { params } = context; // Extract params from context
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { routeId } = params;

  try {
    const deletedRoute = await prisma.route.delete({
      where: { id: routeId },
    });
    console.log(`Admin Route DELETE: Successfully deleted route ${deletedRoute.id} by user ${session.user?.email}`);
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    console.error(`Admin Route DELETE Error (ID: ${routeId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Record not found
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
      // Foreign key constraint (shouldn't happen for Route unless related models are added)
       if (error.code === 'P2003' || error.code === 'P2014') {
         return NextResponse.json(
           { error: 'Cannot delete route due to existing relations.' },
           { status: 409 } // Conflict
         );
      }
    }
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
  }
}