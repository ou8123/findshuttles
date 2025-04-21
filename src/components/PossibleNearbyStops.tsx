'use client';

import { useState } from 'react';

// Define the structure for a nearby stop
export interface NearbyStop {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

// Removed getMarkerLabel helper function

export default function PossibleNearbyStops({
  nearbyStops,
  hoveredId,
  setHoveredId,
  onStopClick,
}: {
  nearbyStops: NearbyStop[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onStopClick: (index: number) => void;
}) {
  // Ensure we have stops to display
  if (!Array.isArray(nearbyStops) || nearbyStops.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Possible Sights Along the Way</h3>
      <p className="text-sm text-amber-600 mb-3">
        Please note: These stops are not guaranteed. Ask your shuttle provider if stopping is possible.
      </p>
      <ul className="space-y-2">
        {nearbyStops.map((stop, index) => (
          <li
            key={stop.id ?? `nearby-${index}`}
            className={`cursor-pointer p-3 rounded-lg border ${
              hoveredId === stop.id
                ? 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200' // Adjusted hover/active for dark
                : 'bg-white border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700' // Added dark mode styles for default state
            }`}
            onMouseEnter={() => setHoveredId(stop.id ?? `nearby-${index}`)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onStopClick(index)}
          >
            <div className="flex items-center">
              {/* Use simple index + 1 for the label */}
              <span className="mr-2 font-bold text-green-600 dark:text-green-400 w-4 text-center"> {/* Dark mode for number */}
                {index + 1}
              </span>
              <span className="font-medium flex-1 text-gray-900 dark:text-gray-100">{stop.name}</span> {/* Dark mode for name */}
            </div>
            {stop.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">{stop.description}</div> /* Dark mode for description */
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
