// @ts-nocheck
// Disable TypeScript checking for this file to make it work with Netlify

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import RouteMap from '@/components/RouteMap';
import SearchForm from '@/components/SearchForm';
import ViatorSimpleWidget from '@/components/ViatorSimpleWidget';
import AutoScroller from '@/components/AutoScroller';
import FormattedDescription from '@/components/FormattedDescription';
import RouteSummaryBlock from '@/components/RouteSummaryBlock'; // Added
import HotelsGrid from '@/components/HotelsGrid'; // Added
// import AmenitiesTable from '@/components/AmenitiesTable'; // Removed - Replaced by Highlights Grid
import Link from 'next/link'; // Ensure Link is imported if not already
// Import necessary Heroicons for the Highlights Grid helper
import * as HIcons from '@heroicons/react/24/outline';

// Generate viewport metadata as a simple JavaScript function
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  };
}

// Generate metadata as a simple JavaScript function
export async function generateMetadata({ params }) {
  // Get the route slug from params
  const resolvedParams = await params;
  const { routeSlug } = resolvedParams;
  
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
    // Refactored query to use only 'include' and select necessary fields
    const routeData = await prisma.route.findUnique({
      where: { routeSlug },
      // Select direct fields needed
      select: {
        id: true,
        routeSlug: true,
        displayName: true,
        viatorWidgetCode: true,
        seoDescription: true,
        otherStops: true,
        travelTime: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        createdAt: true,
        updatedAt: true,
        departureCityId: true,
        departureCountryId: true,
        destinationCityId: true,
        destinationCountryId: true,
        // Include related data with specific fields
        departureCity: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true
          }
        },
        departureCountry: {
          select: { name: true, slug: true } // Ensure slug is selected
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
          select: { name: true, slug: true } // Added slug selection
        },
        hotelsServed: {
          select: {
            name: true // Select only the name from hotels
          }
        },
        amenities: {
          select: {
            name: true,
            icon: true // Select name and icon from amenities
          }
        }
      }
    });
    return routeData;

  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

// Helper function to get Heroicon component by name string
// Returns outline version by default
const getAmenityIcon = (iconName) => {
  if (!iconName || typeof iconName !== 'string') return null;
  
  // Construct the expected component name (e.g., "WifiIcon")
  const componentName = iconName.endsWith('Icon') ? iconName : `${iconName}Icon`;
  
  // Check if the icon exists in the imported Heroicons object
  if (HIcons[componentName]) {
    return HIcons[componentName];
  }
  
  // Fallback or default icon if needed, otherwise null
  // console.warn(`Amenity icon "${componentName}" not found in Heroicons.`);
  return HIcons['CheckCircleIcon']; // Default to CheckCircleIcon if not found
};


/**
 * Route Page - Converted to JavaScript
 * 
 * This version removes all TypeScript annotations to be compatible
 * with Next.js on Netlify
 */
export default async function RoutePage({ params }) {
  // Get the route slug from params
  const resolvedParams = await params;
  const { routeSlug } = resolvedParams;
  
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

  // Prepare breadcrumb data
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: route.departureCountry?.name || 'Country', href: `/countries/${route.departureCountry?.slug || ''}` },
    { name: `${route.departureCity?.name || 'Unknown'} to ${route.destinationCity?.name || 'Unknown'}`, current: true }
  ];

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
          // Removed marginTop: '-12px' to prevent overlap with header
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
          
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-600 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
            <ol className="list-none p-0 inline-flex">
              {breadcrumbItems.map((item, index) => (
                <li key={item.name} className="flex items-center">
                  {index > 0 && <span className="mx-2">&raquo;</span>}
                  {item.current ? (
                    <span className="text-gray-900 dark:text-white font-semibold">{item.name}</span>
                  ) : (
                    <Link href={item.href || '#'} className="hover:underline">{item.name}</Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* === Layout Order === */}

          {/* 1. Top Route Summary Block */}
          <RouteSummaryBlock route={route} />

          {/* NEW: Highlights Grid (Replaces AmenitiesTable) */}
          {route.amenities && route.amenities.length > 0 && (
            <div className="highlights-section mt-6 mb-6"> {/* Added mb-6 */}
              <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Route Highlights</h2>
              <div className="flex flex-wrap items-center gap-2">
                {route.amenities.map((amenity) => {
                  const IconComponent = getAmenityIcon(amenity.icon); // Use the helper
                  return (
                    <div key={amenity.id} className="inline-flex items-center bg-blue-100 dark:bg-gray-700 text-blue-800 dark:text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">
                      {IconComponent && <IconComponent className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />} 
                      {amenity.name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MOVED UP: Route Description Section */}
          {route.seoDescription && (
            <div className="description-section my-8">
              <h2 className="text-xl font-semibold mb-3 text-current dark:text-white"> 
                Route Description
               </h2>
              <div className="p-4 bg-white dark:bg-gray-900 rounded shadow-sm">
                {/* Standard disclaimer - Moved inside div, above description */}
                <p className="text-sm italic font-bold text-red-600 dark:text-red-400 mb-3"> 
                  Route descriptions often refer only to the first listing shown.<br />
                  Amenities and services vary by provider.<br />
                  Please review individual listings before booking.
                </p>
                <FormattedDescription 
                  text={route.seoDescription} 
                  className="text-current dark:text-gray-200"
               />
             </div>
           </div>
         )}

          {/* 2. Hotels Served (Optional) - Position relative to Booking Widget */}
          <HotelsGrid hotels={route.hotelsServed} />

           {/* 3. Widgets / Listings Section */}
           <div className="booking-section mb-8">
             <h2 className="text-xl font-semibold mb-3">Book Your Shuttle</h2> 
               {/* Widget with simple implementation that works reliably */}
               {route.viatorWidgetCode ? (
                <ViatorSimpleWidget 
                  key={`viator-${route.routeSlug}`} 
                  widgetCode={route.viatorWidgetCode}
                  className="w-full"
                  minHeight={240}
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-gray-500">Booking widget not available for this route.</p>
                </div>
              )}
            </div>
            
             {/* 4. Route Description Section - MOVED UP */}
             
            {/* 5. Amenity Table - REMOVED */}

            {/* 6. Map Section (Bottom of Page) */}
            {route.departureCity?.latitude && route.departureCity?.longitude &&
            route.destinationCity?.latitude && route.destinationCity?.longitude && (
              <div className="map-section my-8">
                <h2 className="text-xl font-semibold mb-3">Estimated Route</h2> {/* Added mb-3 */}
                {/* Removed caption as requested */}
                <RouteMap
                  departureLat={route.departureCity.latitude}
                  departureLng={route.departureCity.longitude}
                  destinationLat={route.destinationCity.latitude}
                  destinationLng={route.destinationCity.longitude}
                />
               </div>
              )}
  
             {/* 7. Cities Served List - Skipped as requested */}
  
             {/* 8. Link to Destination Country Page */}
             {route.destinationCountry?.slug && route.destinationCountry?.name && (
               <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link 
                    href={`/countries/${route.destinationCountry.slug}`} 
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    &raquo; View all routes in {route.destinationCountry.name}
                  </Link>
               </div>
             )}
  
           </div> {/* Closes <div id="route-content" ... > */}
         </div> {/* Closes <div className="container mx-auto"> */}
         
         {/* Breadcrumb Schema Markup */}
         <script
           type="application/ld+json"
           dangerouslySetInnerHTML={{ __html: JSON.stringify({
             "@context": "https://schema.org",
             "@type": "BreadcrumbList",
             "itemListElement": breadcrumbItems.map((item, index) => ({
               "@type": "ListItem",
               "position": index + 1,
               "name": item.name,
               // Use NEXT_PUBLIC_SITE_URL from env, fallback needed
               ...(item.current ? {} : { "item": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bookshuttles.com'}${item.href}` }) 
             }))
           }) }}
         />
      </AutoScroller>
  );
}
