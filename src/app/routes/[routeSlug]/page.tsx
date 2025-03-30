'use client';

import { useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import RouteMap from '@/components/RouteMap';
import ViatorWidgetRenderer from '@/components/ViatorWidgetRenderer';

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

export default function RoutePage({ params }: any) {
  const [route, setRoute] = useState<RouteWithRelations | null>(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await fetch(`/api/routes/${params.routeSlug}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch route data');
        }
        const data = await response.json();
        setRoute(data);
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [params.routeSlug]);

  if (!route) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600">Loading route information...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="scroll-mt-4">
        <h1 className="text-3xl font-bold mb-4">
          {route.displayName || `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`}
        </h1>

        <div className="space-y-6">
          {/* Render the Viator Widget */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Book Your Shuttle</h2>
            <ViatorWidgetRenderer widgetCode={route.viatorWidgetCode} />
          </div>

          {/* Display SEO Description if available */}
          {route.seoDescription && (
            <div className="p-4 bg-white rounded shadow-sm">
              <h2 className="text-xl font-semibold mb-2 text-black">Route Description</h2>
              <p className="text-black">{route.seoDescription}</p>
            </div>
          )}

          {/* Map Display Section */}
          {route.departureCity?.latitude && route.departureCity?.longitude &&
          route.destinationCity?.latitude && route.destinationCity?.longitude && (
            <div>
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
    </div>
  );
}