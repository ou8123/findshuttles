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
 *              (Ensure the data passed includes `id`, `name`, and the optional `iconName`)
 */

// Define the priority order for amenities
const AMENITY_PRIORITY_ORDER = [
  'WiFi',
  'A/C',
  'Hotel Pickup',
  'Airport Pickup',
  'Private Shuttle',
  'Driver Will Make Stops on Request',
  'Flight Delay Friendly',
  'Bilingual Driver',
  'Scenic / Wildlife Stops',
  'Alcoholic Beverages',
  'Bottled Water',
  'Service Animals Allowed',
  'Child Seats Available', // Updated name
  'Wheelchair Accessible'
];

// Helper function to get the priority index of an amenity
const getAmenityPriority = (name) => {
  if (!name) return 999; // Handle cases where name might be missing
  const index = AMENITY_PRIORITY_ORDER.indexOf(name);
  return index === -1 ? 999 : index; // Items not in the list go last
};


export default function AmenitiesTable({ amenities }) {
  // Return null if amenities array is empty or not provided
  if (!amenities || amenities.length === 0) {
    return null;
  }

  // Sort amenities based on the priority order
  const sortedAmenities = [...amenities].sort((a, b) => {
    // Ensure names exist before trying to sort
    const nameA = a?.name || '';
    const nameB = b?.name || '';
    return getAmenityPriority(nameA) - getAmenityPriority(nameB);
  });

  return (
    <div className="mb-6">
      {/* Changed title */}
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Amenity Highlights</h2>
      {/* Use AmenityBadge component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        {/* Map over the sorted amenities */}
        {sortedAmenities.map((amenity) => (
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
