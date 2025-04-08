// @ts-nocheck
// Disable TypeScript checking for this file

import React from 'react';
import Link from 'next/link';
import { 
  ClockIcon, 
  MapPinIcon,
  StopCircleIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
  // Import icons for amenities
  WifiIcon,
  TruckIcon, // Using TruckIcon for Private Shuttle
  UserGroupIcon, // Using UserGroupIcon for Bilingual Driver
  CameraIcon, // Using CameraIcon for Photo Stops
  CalendarDaysIcon, // Using CalendarDaysIcon for Flexible Timing
  SparklesIcon, // Using SparklesIcon for A/C (as CheckBadgeIcon is not available in outline)
  GiftIcon, // Using GiftIcon for Bottled Water
  FaceSmileIcon, // Using FaceSmileIcon for Car Seats
  CheckBadgeIcon, // Using CheckBadgeIcon for Flight Delay Friendly
  TicketIcon, // Using TicketIcon for Entrance Fees
  ArrowPathRoundedSquareIcon, // Using ArrowPathRoundedSquareIcon for Round Trip
  MapIcon, // Using MapIcon for Scenic Route
  SparklesIcon as ComfortIcon, // Alias for Comfort category icon (example)
  ExclamationCircleIcon, // Fallback/Error icon
  CheckCircleIcon, // Default icon
  HeartIcon, // Example for Accessibility
  AdjustmentsHorizontalIcon // Example for Customization
} from '@heroicons/react/24/outline';

// Define route type labels based on boolean flags
const getRouteTypeLabel = (route) => {
  if (route.isPrivateDriver) return "Private Driving Service";
  if (route.isSightseeingShuttle) return "Sightseeing Shuttle";
  // Combine airport checks - Updated Label
  if (route.isAirportPickup || route.isAirportDropoff) return "Airport or Hotel Transfer"; 
  // Check for standard city-to-city last - Updated Label
  if (route.isCityToCity) return "City-to-City Transfer"; 
  return null; // No specific type identified or default needed
};

// Define amenity categories and their corresponding keys (using DB names) - To be removed
/*
const amenityCategories = {
  Logistics: {
    keys: ['Hotel Pickup', 'Airport Pickup', 'Flight Delay Friendly', 'Round Trip'],
    icon: TruckIcon 
  },
  Comfort: {
    keys: ['A/C', 'WiFi', 'Bottled Water', 'Car Seats Available', 'Complimentary Alcoholic Beverages'],
    icon: ComfortIcon 
  },
  Accessibility: {
    keys: ['Wheelchair Accessible', 'Service Animals Allowed', 'Bilingual Driver'], // Moved Bilingual Driver here
    icon: HeartIcon 
  },
  Customization: {
    keys: ['Optional Stops', 'Private Shuttle', 'Photo Stops', 'Flexible Timing', 'Scenic Route', 'Guided Tour', 'Entrance Fees Included'], // Removed Bilingual Driver from here
    icon: AdjustmentsHorizontalIcon
};
*/

// Mapping from DB amenity name to Heroicon component - To be removed
/*
const amenityIconMap = {
  'Private Shuttle': TruckIcon,
  'A/C': SparklesIcon, // Using SparklesIcon as CheckBadgeIcon is not available in outline
  'WiFi': WifiIcon,
  'Optional Stops': StopCircleIcon,
  'Hotel Pickup': MapPinIcon,
  'Airport Pickup': PaperAirplaneIcon, // Use PaperAirplaneIcon for Airport Pickup consistency
  'Bottled Water': GiftIcon,
  'Car Seats Available': FaceSmileIcon,
  'Bilingual Driver': UserGroupIcon,
  'Flight Delay Friendly': CheckBadgeIcon, // CheckBadgeIcon IS available in outline
  'Complimentary Alcoholic Beverages': GiftIcon, // Reusing GiftIcon
  'Scenic Route': MapIcon,
  'Photo Stops': CameraIcon,
  'Service Animals Allowed': HeartIcon, // Reusing HeartIcon
  'Wheelchair Accessible': HeartIcon, // Reusing HeartIcon
  'Round Trip': ArrowPathRoundedSquareIcon,
  'Guided Tour': UserGroupIcon, // Reusing UserGroupIcon
  'Flexible Timing': CalendarDaysIcon,
};
*/

/**
 * Displays the top summary block for a route page.
 * Includes a link back to the main country page.
 * Renders categorized amenity pills.
 * 
 * Props:
 * - route: The route data object containing departure/destination cities, countries,
 *          otherStops, travelTime, and the amenities relation.
 */
export default function RouteSummaryBlock({ route }) {
  if (!route) {
    return null; // Don't render if route data is missing
  }

  const { 
    departureCity, 
    departureCountry, 
    destinationCity,
    destinationCountry,
    otherStops,
    travelTime,
    amenities, // Keep amenities for now, might be needed elsewhere or removed later
    // Destructure boolean flags for route type determination
    isPrivateDriver,
    isSightseeingShuttle,
    isCityToCity,
    isAirportPickup,
    isAirportDropoff
  } = route;

  // Determine route type label
  const routeTypeLabel = getRouteTypeLabel(route);

  // Determine country display logic
  let countryDisplay = '';
  if (departureCountry?.name && destinationCountry?.name) {
    if (departureCountry.name === destinationCountry.name) {
      countryDisplay = `Country: ${departureCountry.name}`;
    } else {
      countryDisplay = `Countries: ${departureCountry.name} to ${destinationCountry.name}`;
    }
  } else if (departureCountry?.name) {
    countryDisplay = `Country: ${departureCountry.name}`; // Fallback if only one country is known
  }

  // Check if we have the necessary info for the country link
  const canLinkToCountry = departureCountry?.slug && departureCountry?.name;

  // Helper function to format travel time display
  const formatTravelTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return '';
    let formattedTime = timeStr.trim();
    const startsWithApprox = formattedTime.toLowerCase().startsWith('approx.');
    
    if (startsWithApprox) {
      formattedTime = formattedTime.substring(7).trim(); 
    }

    if (!startsWithApprox && !formattedTime.includes('-') && !formattedTime.toLowerCase().startsWith('about ') && 
        (formattedTime.match(/^\d+(\.\d+)?\s+hour(s)?$/i) || formattedTime.match(/^\w+\s+hour(s)?$/i))) {
       return `About ${formattedTime}`;
    }
    
    return formattedTime;
  };

  // Removed the logic that filtered amenities into categories as it's no longer used here.

  return (
    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
      {/* Display Name and Route Type Badge */}
      <div className="flex items-center gap-x-3 mb-3"> {/* Flex container for title and badge */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          {route.displayName || `Shuttles from ${departureCity?.name || 'Unknown'} to ${destinationCity?.name || 'Unknown'}`}
        </h1>
        {/* Route Type Badge */}
        {routeTypeLabel && (
          <span className="px-3 py-1 rounded-xl text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 whitespace-nowrap"> {/* Use bg-muted equivalent */}
            {routeTypeLabel}
          </span>
        )}
      </div>

      {/* Route Details */}
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
        {countryDisplay && (
          <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <p><span className="font-semibold">{countryDisplay}</span></p> 
          </div>
        )}
        {departureCity?.name && (
          <div className="flex items-center">
            {route.isAirportPickup ? (
              <PaperAirplaneIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            ) : (
              <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" /> 
            )}
            <p><span className="font-semibold">Departing From:</span> {departureCity.name}</p>
          </div>
        )}
        {destinationCity?.name && (
          <div className="flex items-center">
              {route.isAirportDropoff ? (
              <PaperAirplaneIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            ) : (
              <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" /> 
            )}
            <p><span className="font-semibold">Arriving At:</span> {destinationCity.name}</p>
          </div>
         )}
         {otherStops && (
           <div className="flex items-center">
             <StopCircleIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" /> 
             <p><span className="font-semibold">Optional Stops:</span> {otherStops}</p>
           </div>
         )}
         {travelTime && (
           <div className="flex items-center">
             <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
             <p><span className="font-semibold">Travel Time:</span> {formatTravelTime(travelTime)}</p>
           </div>
         )}
       </div>

      {/* REMOVED Categorized Highlights Grid - This logic should move to a separate component or be handled differently */}
 
      {/* Link to Country Page */}
      {canLinkToCountry && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <Link 
            href={`/countries/${departureCountry.slug}`} 
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            &raquo; View all routes in {departureCountry.name}
          </Link>
        </div>
      )}
    </div>
  );
}
