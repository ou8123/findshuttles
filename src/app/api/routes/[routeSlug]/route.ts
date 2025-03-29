import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { routeSlug: string } }
) {
  try {
    const route = await prisma.route.findUnique({
      where: { routeSlug: params.routeSlug },
      select: {
        routeSlug: true,
        displayName: true,
        viatorWidgetCode: true,
        seoDescription: true,
        departureCity: {
          select: { 
            name: true, 
            latitude: true, 
            longitude: true 
          }
        },
        departureCountry: { 
          select: { name: true } 
        },
        destinationCity: {
          select: { 
            name: true, 
            latitude: true, 
            longitude: true 
          }
        },
        destinationCountry: { 
          select: { name: true } 
        },
      },
    });

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route data' },
      { status: 500 }
    );
  }
}