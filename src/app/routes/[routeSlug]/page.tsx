'use client';

import { useEffect, useRef, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { use } from 'react';
import RouteMap from '@/components/RouteMap';
import SearchForm from '@/components/SearchForm';
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

/**
 * RoutePage Component
 * 
 * This component displays information about a specific shuttle route, including
 * Viator booking widgets. We use a special key mechanism to ensure widgets re-render
 * completely after navigation.
 */
export default function RoutePage({
  params
}: {
  params: Promise<{ routeSlug: string }>
}) {
  const { routeSlug } = use(params);
  const contentRef = useRef<HTMLDivElement>(null);
  const [route, setRoute] = useState<RouteWithRelations | null>(null);
  
  // We need both the routeSlug and a timestamp to create a truly unique key
  // that will force a complete remount on navigation
  const searchParams = useSearchParams();
  
  // Create a key that will change any time there's a navigation
  // This is critical for forcing a complete widget remount
  const renderKey = `widget-${routeSlug}-${Date.now()}-${Math.random()}`;

  // Handle auto-scroll and component lifecycle
  useEffect(() => {
    // Add class to mark the route as loaded via client navigation
    document.body.classList.add('route-loaded');
    
    // Auto-scroll to content section when route data is loaded
    if (route && contentRef.current) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth' });
        console.log('Auto-scrolled to content section');
      }, 300);
      
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('route-loaded');
      };
    }
    
    return () => {
      document.body.classList.remove('route-loaded');
    };
  }, [route]); // Re-run when route data loads

  // Fetch route data
  useEffect(() => {
    const fetchRoute = async () => {
      setRoute(null); // Reset route on slug change
      try {
        console.log(`Fetching route for slug: ${routeSlug}`);
        const response = await fetch(`/api/routes/${routeSlug}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Route not found for slug: ${routeSlug}`);
            notFound();
          }
          throw new Error(`Failed to fetch route data (status: ${response.status})`);
        }
        const data = await response.json();
        console.log(`Route data received for ${routeSlug}`);
        setRoute(data);
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [routeSlug]);

  const isLoadingRoute = !route;

  return (
    <div>
      {/* Search form with enhanced visibility styles for both local dev and Netlify */}
      <div id="search-form-container" className="mb-8 -mx-4 py-4 bg-white border-b border-gray-200 shadow-sm relative z-10" style={{display: 'block', visibility: 'visible'}}>
        <SearchForm className="rounded-lg shadow-md max-w-2xl mx-auto !block" />
      </div>

      {isLoadingRoute ? (
         <div className="flex items-center justify-center min-h-[400px]">
           {/* Keep loading minimal or remove entirely if preferred */}
           {/* <div className="text-lg text-gray-600">Loading route information...</div> */}
         </div>
      ) : (
        <div ref={contentRef} className="scroll-mt-4 mt-12">
          <h1 className="text-3xl font-bold mb-4">
            {route.displayName || `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`}
          </h1>

          {/* Book Your Shuttle section and widget - remove ALL gaps/margins between sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: 0, padding: 0 }}>
            <div style={{ marginBottom: 0, paddingBottom: 0 }}>
              <h2 className="text-xl font-semibold mb-0 pb-0">Book Your Shuttle</h2>
              <div style={{ margin: 0, padding: 0, marginBottom: 0 }}>
                {route.viatorWidgetCode ? (
                  <ViatorWidgetRenderer 
                    key={`viator-${routeSlug}-${Date.now()}`} 
                    widgetCode={route.viatorWidgetCode}
                  />
                ) : (
                  <p>Booking widget not available for this route.</p>
                )}
              </div>
            </div>
 
            {/* Description section - attached directly to widget with no margin */}
            {route.seoDescription && (
              <div style={{ margin: 0, padding: '8px', backgroundColor: 'white', borderRadius: '4px', marginTop: '-5px' }}>
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
      )}
    </div>
  );
}
