import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

type Props = {
  params: {
    routeSlug: string;
  };
};

export async function GET(req: NextRequest, { params }: Props) {
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
      return new Response(
        JSON.stringify({ error: 'Route not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(route),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch route data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}