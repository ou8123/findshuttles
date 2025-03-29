import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { cityId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cityId = params.cityId;
    if (!cityId) {
      return NextResponse.json({ error: 'City ID is required' }, { status: 400 });
    }

    // Check if city exists
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: {
        routesFrom: true,
        routesTo: true,
      },
    });

    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Check if city is used in any routes
    if (city.routesFrom.length > 0 || city.routesTo.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete city that is used in routes' },
        { status: 400 }
      );
    }

    // Delete the city
    await prisma.city.delete({
      where: { id: cityId },
    });

    // Return empty 200 response
    return new NextResponse(null, { status: 200 });

  } catch (error) {
    console.error('Error deleting city:', error);
    return NextResponse.json(
      { error: 'Failed to delete city' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { cityId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cityId = params.cityId;
    if (!cityId) {
      return NextResponse.json({ error: 'City ID is required' }, { status: 400 });
    }

    // Get city with country info
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: {
        country: true,
        routesFrom: true,
        routesTo: true,
      },
    });

    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    return NextResponse.json(city);

  } catch (error) {
    console.error('Error getting city:', error);
    return NextResponse.json(
      { error: 'Failed to get city' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { cityId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cityId = params.cityId;
    if (!cityId) {
      return NextResponse.json({ error: 'City ID is required' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { name, countryId, latitude, longitude } = body;

    if (!name || !countryId) {
      return NextResponse.json(
        { error: 'Name and country ID are required' },
        { status: 400 }
      );
    }

    // Update city
    const updatedCity = await prisma.city.update({
      where: { id: cityId },
      data: {
        name,
        countryId,
        latitude: latitude || null,
        longitude: longitude || null,
      },
      include: {
        country: true,
      },
    });

    return NextResponse.json(updatedCity);

  } catch (error) {
    console.error('Error updating city:', error);
    return NextResponse.json(
      { error: 'Failed to update city' },
      { status: 500 }
    );
  }
}