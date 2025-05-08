'use client'; // This directive marks the component as a Client Component

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

/**
 * Renders a city filter dropdown and a list of routes for a specific country.
 * When "All Routes" is selected, routes are grouped by departure city and sorted by count.
 * When a specific city is selected, displays two lists: "Departing from {City}" and "Arriving to {City}".
 * Appends country name to departure city heading if it's different from the page's country (in 'all' view).
 * Displays travel time next to route links if available.
 * 
 * Props:
 * - country: The country object { id, name, slug }
 * - initialRoutes: Array of all routes for the country. Expected format: 
 *                  [{ id, routeSlug, travelTime, 
 *                     departureCity: { id, name, countryId, country: { name } }, 
 *                     destinationCity: { id, name, countryId } 
 *                  }, ...]
 * - cities: Array of cities within the country available for filtering (used for the dropdown).
 *           Expected format: [{ id, name }, ...]
 */
export default function CountryRouteFilter({ country, initialRoutes = [], cities = [] }) {
  const [selectedCityId, setSelectedCityId] = useState('all'); // 'all' means no filter

  // --- Grouping and Sorting Logic (Used only for 'all' view) ---
  const sortedCityGroups = useMemo(() => {
    if (selectedCityId !== 'all') return null; // Only calculate if needed

    const groups = {}; 
    initialRoutes.forEach(route => {
      if (route.departureCity) {
        const cityId = route.departureCity.id;
        if (!groups[cityId]) {
          groups[cityId] = { 
            name: route.departureCity.name, 
            countryId: route.departureCity.countryId, 
            countryName: route.departureCity.country?.name, 
            routes: [] 
          };
        }
        groups[cityId].routes.push(route);
      }
    });

    const sortedCityIds = Object.keys(groups).sort((a, b) => {
      return groups[b].routes.length - groups[a].routes.length;
    });

    return { sortedCityIds, groups };

  }, [initialRoutes, selectedCityId]); 
  // --- End Grouping and Sorting Logic ---

  // --- Filtered Lists Logic (Used only when a city is selected) ---
  const filteredLists = useMemo(() => {
    if (selectedCityId === 'all') return null; // Only calculate if needed

    const selectedCity = cities.find(c => c.id === selectedCityId);
    const selectedCityName = selectedCity ? selectedCity.name : 'Selected City';

    const departingRoutes = initialRoutes.filter(route => 
      route.departureCity?.id === selectedCityId
    ).sort((a, b) => a.destinationCity.name.localeCompare(b.destinationCity.name)); 

    const arrivingRoutes = initialRoutes.filter(route => 
      route.destinationCity?.id === selectedCityId
    ).sort((a, b) => a.departureCity.name.localeCompare(b.departureCity.name)); 

    return { selectedCityName, departingRoutes, arrivingRoutes };

  }, [selectedCityId, initialRoutes, cities]);
  // --- End Filtered Lists Logic ---


  const handleCityChange = (event) => {
    setSelectedCityId(event.target.value);
  };

  const clearFilter = () => {
    setSelectedCityId('all');
  };

  // Helper function to render a list of routes
  const renderRouteList = (routes) => {
    if (!routes || routes.length === 0) {
      return <p className="text-gray-500 dark:text-gray-400 italic pl-2">No routes found.</p>;
    }
    return (
      <div className="space-y-2 pl-2">
        {routes.map((route) => (
          <div key={route.id || route.routeSlug} className="p-2 border-l-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center">
            {/* Replace Link with standard <a> tag for full page reload */}
            <a href={`/routes/${route.routeSlug}`} className="text-blue-600 hover:underline dark:text-blue-400">
              {route.departureCity?.name || 'Unknown'} to {route.destinationCity?.name || 'Unknown'}
            </a>
            {/* Display travel time if available - Removed hardcoded tilde */}
            {route.travelTime && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                🕒 {route.travelTime} 
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* City Filter Dropdown */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
        {/* Updated Label */}
        <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          🔎 Filter routes by city (departure or arrival):
        </label>
        <select
          id="city-filter"
          name="city-filter"
          value={selectedCityId}
          onChange={handleCityChange}
          className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
        >
          <option value="all">-- Show All Routes --</option> 
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        {/* Clear Filter Button */}
        {selectedCityId !== 'all' && (
          <button 
            onClick={clearFilter}
            className="mt-2 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear Filter
          </button>
        )}
         <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
           Routes are grouped by departure city when showing all routes.
         </p>
      </div>

      {/* Conditional Rendering: All Routes View vs Filtered View */}
      <div className="space-y-6"> 
        {selectedCityId === 'all' ? (
          // Render grouped view when 'all' is selected
          <>
            {sortedCityGroups && sortedCityGroups.sortedCityIds.length > 0 ? (
              sortedCityGroups.sortedCityIds.map((cityId, index) => { 
                const group = sortedCityGroups.groups[cityId];
                const isDifferentCountry = group.countryId !== country.id;
                const countrySuffix = isDifferentCountry && group.countryName ? `, ${group.countryName}` : '';
                // Add top border/padding for separation, except for the first item
                const groupClasses = index > 0 ? "pt-4 border-t border-gray-200 dark:border-gray-700" : ""; 
                return (
                  <div key={cityId} className={groupClasses}>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                      {/* Updated Heading with Van Emoji */}
                      🚐 Departing {group.name}{countrySuffix} ({group.routes.length})
                    </h3>
                    {renderRouteList(group.routes)}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No routes found for {country.name} yet.
              </p>
            )}
          </>
        ) : (
          // Render Departing/Arriving lists when a city is selected
          <>
            {filteredLists && (filteredLists.departingRoutes.length > 0 || filteredLists.arrivingRoutes.length > 0) ? (
              <>
                {/* Departing List */}
                {filteredLists.departingRoutes.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 border-gray-300 dark:border-gray-600">
                      Departing From {filteredLists.selectedCityName}
                    </h3>
                    {renderRouteList(filteredLists.departingRoutes)}
                  </div>
                )}

                {/* Arriving List */}
                 {filteredLists.arrivingRoutes.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700"> {/* Add separator */}
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 border-gray-300 dark:border-gray-600">
                      Arriving At {filteredLists.selectedCityName}
                    </h3>
                    {renderRouteList(filteredLists.arrivingRoutes)}
                  </div>
                 )}
              </>
            ) : (
              // Message if filter yields no results
              <p className="text-gray-500 dark:text-gray-400 italic">
                No routes found involving {filteredLists?.selectedCityName || 'the selected city'} in {country.name}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
