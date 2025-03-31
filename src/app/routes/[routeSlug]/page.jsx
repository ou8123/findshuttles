// @ts-nocheck
// Disable TypeScript checking for this file to make it work with Netlify

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import RouteMap from '@/components/RouteMap';
import SearchForm from '@/components/SearchForm';
import ViatorWidgetRenderer from '@/components/ViatorWidgetRenderer';
import AutoScroller from '@/components/AutoScroller';

// Generate viewport metadata as a simple JavaScript function
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  };
}

// Generate metadata as a simple JavaScript function
export async function generateMetadata({ params }) {
  // Properly destructure and access the route slug
  const { routeSlug } = params;
  
  // Fetch route data
  const route = await fetchRouteData(routeSlug);
  
  if (!route) {
    return {
      title: 'Route Not Found | FindTours.com',
    };
  }

  // Use custom meta title if available, otherwise fallback to display name
  const title = route.metaTitle || 
    route.displayName || 
    `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`;

  return {
    title: title,
    description: route.metaDescription || route.seoDescription || `Find shuttle transportation from ${route.departureCity.name} to ${route.destinationCity.name}`,
    keywords: route.metaKeywords || `shuttle, transportation, ${route.departureCity.name}, ${route.destinationCity.name}`,
  };
}

// Fetch route data function
async function fetchRouteData(routeSlug) {
  try {
    const route = await prisma.route.findUnique({
      where: { routeSlug },
      select: {
        routeSlug: true,
        displayName: true,
        viatorWidgetCode: true,
        seoDescription: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        createdAt: true,
        updatedAt: true,
        departureCity: {
          select: { 
            id: true,
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
            id: true,
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
    return route;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Route Page - Converted to JavaScript
 * 
 * This version removes all TypeScript annotations to be compatible
 * with Next.js on Netlify
 */
export default async function RoutePage({ params }) {
  // Properly destructure and access the route slug
  const { routeSlug } = params || {};
  
  // Validate we have a route slug
  if (!routeSlug) {
    notFound();
  }
  
  // Fetch the route data
  const route = await fetchRouteData(routeSlug);
  
  // If no route found, show 404
  if (!route) {
    notFound();
  }

  // Format dates for display (this happens server-side)
  const createdAtDate = new Date(route.createdAt);
  const updatedAtDate = new Date(route.updatedAt);
  
  const formattedCreatedAt = createdAtDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  
  const formattedUpdatedAt = updatedAtDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });

  return (
    <AutoScroller scrollToSelector="#route-content">
      <div>
        {/* Search form with single shadow box - no extra container styling */}
        <div id="search-form-container" className="mb-8 relative">
          <SearchForm 
            className="rounded-lg shadow-md max-w-2xl mx-auto !block" 
          />
        </div>

        <div id="route-content" className="scroll-mt-4 mt-12">
          <h1 className="text-3xl font-bold mb-4">
            {route.displayName || `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`}
          </h1>

          {/* No dates displayed as per client request */}

          {/* Content sections with stable layout - improved spacing for mobile */}
          <div className="route-content-sections">
            {/* Book Your Shuttle section */}
            <div className="booking-section mb-8">
              <h2 className="text-xl font-semibold mb-3">Book Your Shuttle</h2>
              <div style={{ position: 'relative' }} className="widget-container">
                {route.viatorWidgetCode ? (
                  <ViatorWidgetRenderer 
                    key={`viator-${route.routeSlug}`} 
                    widgetCode={route.viatorWidgetCode}
                    routeSlug={route.routeSlug}
                  />
                ) : (
                  <p>Booking widget not available for this route.</p>
                )}
              </div>
            </div>
            
            {/* Spacer div to create consistent separation */}
            <div style={{ height: '40px' }} aria-hidden="true" />
            
            {/* Description section - with stable spacing whether it exists or not */}
            <div className="description-section my-8">
              {route.seoDescription ? (
                <>
                  <h2 className="text-xl font-semibold mb-3 text-black">Route Description</h2>
                  <div className="p-4 bg-white rounded shadow-sm">
                    <p className="text-black">{route.seoDescription}</p>
                  </div>
                </>
              ) : (
                /* Empty spacer div to maintain consistent layout when no description */
                <div style={{ height: '20px' }} aria-hidden="true" />
              )}
            </div>

            {/* Map Display Section - with increased margin-top for spacing */}
            {route.departureCity?.latitude && route.departureCity?.longitude &&
            route.destinationCity?.latitude && route.destinationCity?.longitude && (
              <div style={{ marginTop: '50px' }} className="map-section mt-8">
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
    </AutoScroller>
  );
}
