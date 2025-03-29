import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface NewRouteData {
  departureCityId: string;
  destinationCityId: string;
  viatorWidgetCode: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  seoDescription?: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Admin Route GET: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const routes = await prisma.route.findMany({
      include: {
        departureCity: { select: { name: true } },
        destinationCity: { select: { name: true } },
        departureCountry: { select: { name: true } },
        destinationCountry: { select: { name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    console.log(`Admin Route GET: Fetched ${routes.length} routes for user ${session.user?.email}`);
    return NextResponse.json(routes, { status: 200 });

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

    // Create route slug and display name without country names
    const routeSlug = `${departureCity.slug}-to-${destinationCity.slug}`;
    const displayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}`;

    const newRoute = await prisma.route.create({
      data: {
        departureCityId: data.departureCityId,
        destinationCityId: data.destinationCityId,
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
    console.error("Admin Route POST: Error creating route.", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
