import { notFound } from 'next/navigation';
import RouteMap from '@/components/RouteMap';
import ViatorWidgetRenderer from '@/components/ViatorWidgetRenderer';
import SearchForm from '@/components/SearchForm';
import prisma from '@/lib/prisma';

interface RouteWithRelations {
  routeSlug: string;
  displayName: string;
  viatorWidgetCode: string;
  seoDescription: string | null;
  departureCity: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  departureCountry: {
    name: string;
  };
  destinationCity: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  destinationCountry: {
    name: string;
  };
}

async function getRouteData(slug: string): Promise<RouteWithRelations | null> {
  try {
    const route = await prisma.route.findUnique({
      where: { routeSlug: slug },
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

    return route as RouteWithRelations | null;
  } catch (error) {
    console.error(`Error fetching route data for slug ${slug}:`, error);
    return null;
  }
}

export default async function RoutePage({
  params,
}: {
  params: { routeSlug: string }
}) {
  const routeData = await getRouteData(params.routeSlug);

  if (!routeData) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <SearchForm />
      </div>
      
      <div>
        <h1 className="text-3xl font-bold mb-4">
          {routeData.displayName || `Shuttles from ${routeData.departureCity.name} to ${routeData.destinationCity.name}`}
        </h1>

        {/* Render the Viator Widget */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Book Your Shuttle</h2>
          {routeData.viatorWidgetCode ? (
            <ViatorWidgetRenderer key={routeData.routeSlug} widgetCode={routeData.viatorWidgetCode} />
          ) : (
            <p>Booking information currently unavailable.</p>
          )}
        </div>

        {/* Display SEO Description if available */}
        {routeData.seoDescription && (
          <div className="mb-6 p-4 bg-white rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-2 text-black">Route Description</h2>
            <p className="text-black">{routeData.seoDescription}</p>
          </div>
        )}

        {/* Map Display Section */}
        {routeData.departureCity?.latitude && routeData.departureCity?.longitude &&
         routeData.destinationCity?.latitude && routeData.destinationCity?.longitude && (
          <div className="my-8">
            <h2 className="text-xl font-semibold mb-3">Route Map</h2>
            <RouteMap
              departureLat={routeData.departureCity.latitude}
              departureLng={routeData.departureCity.longitude}
              destinationLat={routeData.destinationCity.latitude}
              destinationLng={routeData.destinationCity.longitude}
            />
          </div>
        )}
      </div>
    </div>
  );
}