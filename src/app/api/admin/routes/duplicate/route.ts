import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface DuplicateRouteRequest {
  routeId: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Admin Route Duplicate: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: DuplicateRouteRequest;
  try {
    data = await request.json();
  } catch (error) {
    console.error("Admin Route Duplicate: Invalid JSON body.", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!data.routeId) {
    return NextResponse.json(
      { error: 'Missing required field: routeId' },
      { status: 400 }
    );
  }

  try {
    // Find the original route with all its data
    const originalRoute = await prisma.route.findUnique({
      where: { id: data.routeId },
      include: {
        departureCity: true,
        destinationCity: true,
        departureCountry: true,
        destinationCountry: true,
      }
    });

    if (!originalRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Get the base slug (without existing copy numbers)
    const baseSlug = originalRoute.routeSlug.replace(/copy\d+$/, '');
    
    // Find existing copies of this route to determine the next copy number
    const existingCopies = await prisma.route.findMany({
      where: {
        routeSlug: {
          startsWith: baseSlug,
          not: originalRoute.routeSlug
        }
      },
      select: {
        routeSlug: true
      }
    });

    // Extract existing copy numbers
    const copyNumberRegex = new RegExp(`^${baseSlug}copy(\\d+)$`);
    const existingNumbers = existingCopies
      .map(route => {
        const match = route.routeSlug.match(copyNumberRegex);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));

    // Determine the next copy number
    const nextCopyNumber = existingNumbers.length > 0
      ? Math.max(...existingNumbers) + 1
      : 1;

    // Create the new slug with the copy number
    const newSlug = `${baseSlug}copy${nextCopyNumber}`;
    
    // Create a display name with (Copy) indication
    const newDisplayName = `${originalRoute.displayName} (Copy ${nextCopyNumber})`;

    // Create the new route
    const newRoute = await prisma.route.create({
      data: {
        departureCityId: originalRoute.departureCityId,
        destinationCityId: originalRoute.destinationCityId,
        departureCountryId: originalRoute.departureCountryId,
        destinationCountryId: originalRoute.destinationCountryId,
        routeSlug: newSlug,
        displayName: newDisplayName,
        viatorWidgetCode: originalRoute.viatorWidgetCode,
        metaTitle: originalRoute.metaTitle,
        metaDescription: originalRoute.metaDescription,
        metaKeywords: originalRoute.metaKeywords,
        seoDescription: originalRoute.seoDescription,
      },
      include: {
        departureCity: {
          select: { name: true }
        },
        destinationCity: {
          select: { name: true }
        },
        departureCountry: {
          select: { name: true }
        },
        destinationCountry: {
          select: { name: true }
        }
      }
    });

    console.log(`Admin Route Duplicate: Successfully duplicated route ${originalRoute.id} to ${newRoute.id} by user ${session.user?.email}`);
    return NextResponse.json(newRoute, { status: 201 });

  } catch (error) {
    console.error("Admin Route Duplicate: Error duplicating route.", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A route with this slug already exists. Please try again.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to duplicate route' },
      { status: 500 }
    );
  }
}
