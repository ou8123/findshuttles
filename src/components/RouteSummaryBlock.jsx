// @ts-nocheck
// Disable TypeScript checking for this file

import React from 'react';
import Link from 'next/link'; // Import Link
import { 
  ClockIcon, 
  MapPinIcon,        // Keep MapPinIcon
  StopCircleIcon,    // Use StopCircleIcon instead of StopIcon
  // BuildingOfficeIcon, // Remove BuildingOfficeIcon
  GlobeAltIcon,
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline'; // Using outline style

/**
 * Displays the top summary block for a route page.
 * Includes a link back to the main country page.
 * 
 * Props:
 * - route: The route data object containing departure/destination cities, countries (including departureCountry.slug),
 *          otherStops, and travelTime.
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
    travelTime 
  } = route;

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
    
    // Remove "Approx." if present
    if (startsWithApprox) {
      formattedTime = formattedTime.substring(7).trim(); // Remove "Approx. "
    }

    // If it wasn't originally "Approx." and it's not a range, prepend "About "
    // Basic check for single number/word followed by "hour(s)"
    if (!startsWithApprox && !formattedTime.includes('-') && !formattedTime.toLowerCase().startsWith('about ') && 
        (formattedTime.match(/^\d+(\.\d+)?\s+hour(s)?$/i) || formattedTime.match(/^\w+\s+hour(s)?$/i))) {
       return `About ${formattedTime}`;
    }
    
    // Return the cleaned or original time
    return formattedTime;
  };

  return (
    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
      {/* Display Name as the main heading */}
      <h1 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900 dark:text-white">
        {route.displayName || `Shuttles from ${departureCity?.name || 'Unknown'} to ${destinationCity?.name || 'Unknown'}`}
      </h1>
      
      {/* Route Details */}
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300"> {/* Increased space-y */}
        {countryDisplay && (
          <div className="flex items-center">
            <GlobeAltIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <p><span className="font-semibold">{countryDisplay}</span></p> {/* Removed emoji */}
          </div>
        )}
        {departureCity?.name && (
          <div className="flex items-center">
            {route.isAirportPickup ? (
              <PaperAirplaneIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            ) : (
              <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" /> // Changed to MapPinIcon
            )}
            <p><span className="font-semibold">Departing From:</span> {departureCity.name}</p>
          </div>
        )}
        {destinationCity?.name && (
          <div className="flex items-center">
              {route.isAirportDropoff ? (
              <PaperAirplaneIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            ) : (
              <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" /> // Changed to MapPinIcon
            )}
            <p><span className="font-semibold">Arriving At:</span> {destinationCity.name}</p>
          </div>
         )}
         {otherStops && (
           <div className="flex items-center">
             <StopCircleIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" /> {/* Changed to StopCircleIcon */}
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
