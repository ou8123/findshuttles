import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface UpdateRouteData {
  departureCityId: string;
  destinationCityId: string;
  viatorWidgetCode: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  seoDescription?: string | null;
}

export async function PUT(request: Request, context: any) {
  const params = context.params as { routeId: string };
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
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
    // Fetch cities with their countries for the slug
    const [departureCity, destinationCity] = await Promise.all([
      prisma.city.findUnique({
        where: { id: data.departureCityId },
        include: { country: true }
      }),
      prisma.city.findUnique({
        where: { id: data.destinationCityId },
        include: { country: true }
      })
    ]);

    if (!departureCity || !destinationCity) {
      return NextResponse.json({ error: 'Invalid departure or destination city ID' }, { status: 400 });
    }

    // Check if the route already exists with this slug, excluding the current route
    const routeSlug = `${departureCity.country.slug}-${departureCity.slug}-to-${destinationCity.slug}`;
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
        { error: `A route from ${departureCity.name} to ${destinationCity.name} already exists.` },
        { status: 409 }
      );
    }

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: {
        departureCityId: data.departureCityId,
        destinationCityId: data.destinationCityId,
        departureCountryId: departureCity.country.id,
        destinationCountryId: destinationCity.country.id,
        routeSlug: routeSlug,
        viatorWidgetCode: data.viatorWidgetCode,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords,
        seoDescription: data.seoDescription,
      },
    });
    console.log(`Admin Route PUT: Successfully updated route ${updatedRoute.id} by user ${session.user?.email}`);
    return NextResponse.json(updatedRoute);

  } catch (error) {
    console.error(`Admin Route PUT Error (ID: ${routeId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Record not found for update
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  const params = context.params as { routeId: string };
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
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
  }
}
