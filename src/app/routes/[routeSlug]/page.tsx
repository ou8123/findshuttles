// Re-enable TypeScript checking

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import RouteMap from '@/components/RouteMap';
import SearchForm from '@/components/SearchForm';
import ViatorSimpleWidget from '@/components/ViatorSimpleWidget';
import AutoScroller from '@/components/AutoScroller';
import FormattedDescription from '@/components/FormattedDescription';
import RouteSummaryBlock from '@/components/RouteSummaryBlock'; // Added
import HotelsGrid from '@/components/HotelsGrid'; // Added
import ItinerarySection from '@/components/ItinerarySection'; // Import the new component
import AmenitiesTable from '@/components/AmenitiesTable'; // Import AmenitiesTable
import Link from 'next/link'; // Ensure Link is imported if not already
// Import necessary Heroicons for the Highlights Grid helper
import * as HIcons from '@heroicons/react/24/outline';
import { Prisma } from '@prisma/client'; // Import Prisma for JsonValue type
import { Waypoint } from '@/types/common'; // Import the Waypoint type
import PossibleNearbyStops, { NearbyStop } from '@/components/PossibleNearbyStops'; // Import the new component
import RouteMapWithNearbyStops from '@/components/RouteMapWithNearbyStops'; // Import the combined component

// Define the structure for a waypoint stop (matching aiWaypoints.ts)
interface WaypointStop {
  name: string;
  lat: number;
  lng: number;
}

// Type guard for nearby stops
function isNearbyStop(obj: any): obj is NearbyStop {
  return typeof obj === 'object' && obj !== null &&
         typeof obj.name === 'string' &&
         typeof obj.lat === 'number' &&
         typeof obj.lng === 'number';
}

// Type guard to check if an object is a valid WaypointStop
function isWaypointStop(obj: any): obj is WaypointStop {
    return typeof obj === 'object' && obj !== null &&
           typeof obj.name === 'string' &&
           typeof obj.lat === 'number' &&
           typeof obj.lng === 'number';
}

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

  // Determine title based on route type and cities
  let title = route.metaTitle || route.displayName; // Start with meta or display name
  if (!title) { // If neither metaTitle nor displayName is set
    if (route.isPrivateDriver && route.departureCityId === route.destinationCityId) {
      title = `Private Driving Service in ${route.departureCity.name}`;
    } else {
      title = `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`;
    }
  }

  return {
    title: title, // Use the determined title
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
        isAirportPickup: true, // Fetch flags needed for amenity logic
        isAirportDropoff: true,
        isCityToCity: true,
        isPrivateDriver: true, // Fetch new flag
        isSightseeingShuttle: true, // Fetch new flag
        mapWaypoints: true, // Fetch mapWaypoints
        possibleNearbyStops: true, // Fetch possible nearby stops
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
        amenities: { // Keep fetching amenities in case needed later
          select: {
            id: true, 
            name: true
            // Removed icon: true as it doesn't exist on the Amenity model
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
 * Route Page - Now using .tsx extension
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

  // Prepare breadcrumb data - Adjust last item for private driver same-city routes
  const lastBreadcrumbName = (route.isPrivateDriver && route.departureCityId === route.destinationCityId)
    ? route.displayName || `Private Driving Service in ${route.departureCity?.name || 'City'}` // Use display name or generic
    : `${route.departureCity?.name || 'Unknown'} to ${route.destinationCity?.name || 'Unknown'}`;

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: route.departureCountry?.name || 'Country', href: `/countries/${route.departureCountry?.slug || ''}` },
    { name: lastBreadcrumbName, current: true }
  ];


  // --- Prepare Product Schema JSON-LD ---
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bookshuttles.com'; // Base URL from env or fallback
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    // Use displayName or construct a name
    "name": route.displayName || `Shuttle: ${route.departureCity?.name} to ${route.destinationCity?.name}`,
    // Use metaDescription or fallback
    "description": route.metaDescription || `Book reliable shuttle transportation from ${route.departureCity?.name} to ${route.destinationCity?.name}.`,
    "brand": {
      "@type": "Brand",
      "name": "BookShuttles.com" // Static brand name
    },
    "category": "Travel", // Static category
    // Construct the canonical URL for the route
    "url": `${siteUrl}/routes/${route.routeSlug}`, 
    // Offers and Review are omitted as data is not available
  };
  // --- End Product Schema ---

  // Define the mapping from camelCase amenity key to display text (emoji + name)
  // This should align with the names stored in your Amenity table
  const amenityDisplayMap = {
    privateShuttle: "🚐 Private Shuttle",
    ac: "✅ A/C", 
    wifi: "📶 WiFi",
    optionalStops: "🛑 Driver Will Make Stops on Request", 
    hotelPickup: "📍 Hotel Pickup",
    airportPickup: "📍 Airport Pickup",
    bottledWater: "💧 Bottled Water",
    carSeats: "🧸 Car Seats Available", 
    bilingualDriver: "🧑‍✈️ Bilingual Driver",
    flightDelayFriendly: "🕒 Flight Delay Friendly",
    alcoholicBeverages: "🍷 Complimentary Alcoholic Beverages", 
    scenicStops: "📷 Scenic / Wildlife Stops", 
    serviceAnimals: "🦮 Service Animals Allowed", 
    wheelchairAccessible: "♿️ Wheelchair Accessible" 
  };

  // Helper function to convert DB amenity name to camelCase key
  const toCamelCase = (str) => { // Removed :string type annotation
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
  }

  // --- Logic to determine map display ---
  const isTourType = route.isPrivateDriver || route.isSightseeingShuttle;
  const isSameCityRoute = route.departureCityId === route.destinationCityId;
  
  // Safely check and filter mapWaypoints, then assert the type of the resulting array
  const filteredWaypoints = Array.isArray(route.mapWaypoints) ? route.mapWaypoints.filter(isWaypointStop) : [];
  const validWaypoints = filteredWaypoints as unknown as WaypointStop[]; // Assert type here
  // Corrected condition: require at least 1 valid waypoint for tour map
  const hasValidWaypoints = validWaypoints.length >= 1; 
  
  // Process possible nearby stops for applicable route types
  const isApplicableForNearbyStops = (route.isAirportPickup || route.isAirportDropoff || route.isCityToCity) && !isTourType;
  const filteredNearbyStops = isApplicableForNearbyStops && Array.isArray(route.possibleNearbyStops) 
    ? route.possibleNearbyStops.filter(isNearbyStop) 
    : [];
  const validNearbyStops = filteredNearbyStops as unknown as NearbyStop[];
  const hasValidNearbyStops = validNearbyStops.length >= 1;
  
  // Determine which map type to show (Corrected Logic)
  let mapType = 'standard'; // Default to standard A-to-B
  if (isTourType && hasValidWaypoints) { // If it's a tour AND has waypoints, show waypoint map
    mapType = 'waypoints'; 
  } else if (isTourType && isSameCityRoute && !hasValidWaypoints) { // If it's a same-city tour WITHOUT waypoints, show nothing
    mapType = 'none'; 
  }
  // Otherwise, it remains 'standard' (for non-tour routes, or tours without enough valid waypoints)
  // --- End map display logic ---

  // --- Logic for Itinerary Section ---
  const showItinerary = (route.isPrivateDriver || route.isSightseeingShuttle) && validWaypoints.length > 0;
  let itineraryTitle = '';
  if (showItinerary) {
    if (route.isPrivateDriver) {
      // Use the new title for Private Driver
      itineraryTitle = "Sample Day Trip Itinerary with Private Driver"; 
    } else if (route.isSightseeingShuttle) {
      // Use the new title for Sightseeing Shuttle
      itineraryTitle = "Sightseeing Route Overview"; 
    }
  }
  // --- End Itinerary Section Logic ---

  // Add logging before return
  console.log('[RoutePage Debug]', {
    routeSlug,
    isTourType,
    isSameCityRoute,
    mapWaypointsFromDB: route.mapWaypoints, // Log raw DB data
    filteredWaypoints, // Log after filtering
    validWaypoints, // Log after type assertion
    hasValidWaypoints,
    mapType // Log the final mapType
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
          position: 'relative', 
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

          {/* 1. Top Route Summary Block (Now includes Route Type Badge) */}
          <RouteSummaryBlock route={route} />

          {/* NEW: Amenities Highlights Grid */}
          <AmenitiesTable amenities={route.amenities} /> 

          {/* 4. Hotels Served (Optional) */}
          <HotelsGrid hotels={route.hotelsServed} />

          {/* 2. Route Description Section (Moved Up) */}
          {route.seoDescription && (
            <div className="description-section my-8">
              <h2 className="text-xl font-semibold mb-3 text-current dark:text-white"> 
                Route Description
               </h2>
              <div className="p-4 bg-white dark:bg-gray-900 rounded shadow-sm">
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

           {/* 5. Widgets / Listings Section */}
           <div className="booking-section mb-8">
             <h2 className="text-xl font-semibold mb-3">Book Your Shuttle</h2> 
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

            {/* MOVED: Conditional Itinerary Section (Now after booking widget) */}
            {showItinerary && (
              <ItinerarySection 
                title={itineraryTitle} 
                waypoints={validWaypoints as Waypoint[]} // Pass validated waypoints, assert type
                // Pass necessary props for directions fetching
                departureCity={route.departureCity}
                destinationCity={route.destinationCity}
                isTourRoute={isTourType} 
              />
            )}
            
             {/* 6. Map Section (Bottom of Page) - Conditionally Render based on route type */}
             {/* Show this original map ONLY if it's NOT a Private Driver or Sightseeing Shuttle route */}
             { !showItinerary && (
               <div className="map-section my-8">
                 {mapType === 'standard' && route.departureCity?.latitude && route.departureCity?.longitude && route.destinationCity?.latitude && route.destinationCity?.longitude && (
                <>
                  <h2 className="text-xl font-semibold mb-3">Estimated Route</h2>
                  
                  {/* Use combined component when nearby stops are available, otherwise use regular RouteMap */}
                  {hasValidNearbyStops ? (
                    <RouteMapWithNearbyStops
                      departureLat={route.departureCity.latitude}
                      departureLng={route.departureCity.longitude}
                      destinationLat={route.destinationCity.latitude}
                      destinationLng={route.destinationCity.longitude}
                      possibleNearbyStops={validNearbyStops}
                      isTourRoute={isTourType}
                    />
                  ) : (
                    <RouteMap
                      departureLat={route.departureCity.latitude}
                      departureLng={route.departureCity.longitude}
                      destinationLat={route.destinationCity.latitude}
                      destinationLng={route.destinationCity.longitude}
                      isTourRoute={isTourType}
                    />
                  )}
                </>
              )}
              {mapType === 'waypoints' && route.departureCity?.latitude && route.departureCity?.longitude && route.destinationCity?.latitude && route.destinationCity?.longitude && (
                 <>
                   <h2 className="text-xl font-semibold mb-3">Suggested Route with Stops</h2>
                   
                   {/* Use combined component when nearby stops are available for waypoint routes too */}
                   {hasValidNearbyStops ? (
                     <RouteMapWithNearbyStops
                       departureLat={route.departureCity.latitude}
                       departureLng={route.departureCity.longitude}
                       destinationLat={route.destinationCity.latitude}
                       destinationLng={route.destinationCity.longitude}
                       waypoints={validWaypoints}
                       possibleNearbyStops={validNearbyStops}
                       isTourRoute={isTourType}
                     />
                   ) : (
                     <RouteMap
                       departureLat={route.departureCity.latitude}
                       departureLng={route.departureCity.longitude}
                       destinationLat={route.destinationCity.latitude}
                       destinationLng={route.destinationCity.longitude}
                       waypoints={validWaypoints}
                       isTourRoute={isTourType}
                     />
                   )}
                   
                   <p className="text-xs text-gray-500 mt-1 text-center">This is a suggested route based on popular stops. Actual route may vary.</p>

                   {/* Only show this if we're not showing the nearby stops list */}
                   {!hasValidNearbyStops && validWaypoints && validWaypoints.length > 0 && (
                     <div className="mt-6">
                       <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Stops Along the Way</h3>
                       <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                         {validWaypoints.map((waypoint, index) => ( 
                           <li key={index}>
                             {waypoint.name || `Stop ${index + 1}`} 
                           </li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </>
               )}
                {mapType === 'none' && (
                 <div className="flex items-center justify-center h-32 bg-gray-50 border border-dashed border-gray-300 rounded">
                    <p className="text-gray-500 italic">Map directions not applicable for this same-city tour/service.</p>
                  </div>
                )}
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
               ...(item.current ? {} : { "item": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bookshuttles.com'}${item.href}` }) 
             }))
           }) }}
         />

         {/* Product Schema Markup */}
         <script
           type="application/ld+json"
           dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
         />
      </AutoScroller>
  );
}
