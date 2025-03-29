'use client';

import { useEffect, useState, useRef } from 'react';
import { notFound } from 'next/navigation';
import RouteMap from '@/components/RouteMap';
import ViatorWidgetRenderer from '@/components/ViatorWidgetRenderer';
import SearchForm from '@/components/SearchForm';

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

export default function RoutePage({
  params,
}: {
  params: { routeSlug: string }
}) {
  const [routeData, setRouteData] = useState<RouteWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/routes/${params.routeSlug}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch route data');
        }
        const data = await response.json();
        setRouteData(data);

        // Scroll to content after data is loaded
        if (contentRef.current) {
          contentRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        console.error('Error fetching route data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load route data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRouteData();
  }, [params.routeSlug]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <SearchForm />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-600">Loading route information...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <SearchForm />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!routeData) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <SearchForm />
      </div>
      
      <div ref={contentRef}>
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