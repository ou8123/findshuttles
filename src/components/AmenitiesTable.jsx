// @ts-nocheck 
// Keep TS checking disabled for now as props might change slightly depending on data source
import React from 'react';
import AmenityBadge from './AmenityBadge'; // Import the new component

/**
 * Displays a grid of amenity highlights using the AmenityBadge component.
 * 
 * Props:
 * - amenities: An array of amenity objects, expected format: 
 *              [{ id: string, name: string, iconName?: string | null }, ...]
 *              (Ensure the data passed includes `id` and the optional `iconName`)
 */
export default function AmenitiesTable({ amenities }) {
  // Return null if amenities array is empty or not provided
  if (!amenities || amenities.length === 0) {
    return null; 
  }

  return (
    <div className="mb-6">
      {/* Changed title */}
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Amenity Highlights</h2>
      {/* Use AmenityBadge component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        {amenities.map((amenity) => (
          // Use AmenityBadge, passing name and iconName
          <AmenityBadge 
            key={amenity.id} // Use amenity.id for a stable key
            name={amenity.name} 
            iconName={amenity.iconName} // Pass the iconName from data
          />
        ))}
      </div>
    </div>
  );
}
