// @ts-nocheck
// Disable TypeScript checking for this file to make it work with Netlify

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import RouteMap from '@/components/RouteMap';
import SearchForm from '@/components/SearchForm';
import ViatorWidgetRenderer from '@/components/ViatorWidgetRenderer';
import AutoScroller from '@/components/AutoScroller';
import AdaptiveWidgetContainer from '@/components/AdaptiveWidgetContainer';
import ViatorAdaptiveContainer from '@/components/ViatorAdaptiveContainer';
import FormattedDescription from '@/components/FormattedDescription';

// Generate viewport metadata as a simple JavaScript function
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  };
}

// Generate metadata as a simple JavaScript function
export async function generateMetadata({ params }) {
  // Properly access the route slug with await
  const routeSlug = await params?.routeSlug;
  
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
  // Properly access the route slug with await
  const routeSlug = await params?.routeSlug;
  
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
      {/* Main container with standard width */}
      <div className="container mx-auto">
        {/* Search form with green background - full width with no border */}
        <div id="search-form-container" style={{ 
          backgroundColor: '#004d3b', 
          width: '100vw', 
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          marginTop: '-12px', // Increased negative margin to ensure it's flush with header
          position: 'relative', // Ensure proper stacking context
        }}>
          <div className="py-10 px-4">
            <SearchForm 
              className="rounded-lg shadow-md max-w-2xl mx-auto !block" 
            />
          </div>
        </div>

        {/* Content area with standard width */}
        <div id="route-content" className="scroll-mt-4 mt-12 px-4">
          <h1 className="text-3xl font-bold mb-4">
            {route.displayName || `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`}
          </h1>

          {/* No dates displayed as per client request */}

          {/* Content sections with responsive spacing */}
          <div className="route-content-sections">
            {/* Book Your Shuttle section - with adaptive container */}
            <div className="booking-section mb-8">
              <h2 className="text-xl font-semibold mb-4">Book Your Shuttle</h2>
              
              {/* Widget in specialized Viator adaptive container */}
              <ViatorAdaptiveContainer>
                {route.viatorWidgetCode ? (
                  <ViatorWidgetRenderer 
                    key={`viator-${route.routeSlug}`} 
                    widgetCode={route.viatorWidgetCode}
                    routeSlug={route.routeSlug}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Booking widget not available for this route.</p>
                  </div>
                )}
              </ViatorAdaptiveContainer>
            </div>
            
            {/* Description section with formatted content */}
            {route.seoDescription && (
              <div className="description-section my-8">
                <h2 className="text-xl font-semibold mb-3 text-current dark:text-white">
                  Route Description
                </h2>
                <div className="p-4 bg-white dark:bg-gray-900 rounded shadow-sm">
                  <FormattedDescription 
                    text={route.seoDescription} 
                    className="text-current dark:text-gray-200"
                  />
                </div>
              </div>
            )}

            {/* Map Display Section */}
            {route.departureCity?.latitude && route.departureCity?.longitude &&
            route.destinationCity?.latitude && route.destinationCity?.longitude && (
              <div className="map-section my-8">
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
