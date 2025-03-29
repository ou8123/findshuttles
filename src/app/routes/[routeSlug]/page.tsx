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

export default async function RoutePage({ params }: any) {
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
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <SearchForm />
      </div>
      
      <div>
        <h1 className="text-3xl font-bold mb-4">
          {route.displayName || `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`}
        </h1>

        {/* Render the Viator Widget */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Book Your Shuttle</h2>
          {route.viatorWidgetCode ? (
            <ViatorWidgetRenderer key={route.routeSlug} widgetCode={route.viatorWidgetCode} />
          ) : (
            <p>Booking information currently unavailable.</p>
          )}
        </div>

        {/* Display SEO Description if available */}
        {route.seoDescription && (
          <div className="mb-6 p-4 bg-white rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-2 text-black">Route Description</h2>
            <p className="text-black">{route.seoDescription}</p>
          </div>
        )}

        {/* Map Display Section */}
        {route.departureCity?.latitude && route.departureCity?.longitude &&
         route.destinationCity?.latitude && route.destinationCity?.longitude && (
          <div className="my-8">
            <h2 className="text-xl font-semibold mb-3">Route Map</h2>
            <RouteMap
              departureLat={route.departureCity.latitude}
              departureLng={route.departureCity.longitude}
              destinationLat={route.destinationCity.latitude}
              destinationLng={route.destinationCity.longitude}
            />
          </div>
        )}
      </div>
    </div>
  );
}