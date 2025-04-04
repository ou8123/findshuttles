// @ts-nocheck
// Disable TypeScript checking for this file

import React from 'react';

// Simple checkmark icon component (fallback)
const CheckIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-4 w-4 inline-block mr-2 text-green-600 dark:text-green-400 flex-shrink-0" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Map common amenity names to emojis (can be expanded)
const amenityEmojiMap = {
  'air conditioning': '❄️',
  'wi-fi on board': '📶',
  'wifi on board': '📶',
  'wifi': '📶',
  'airport greeting': '👋',
  'reclining seats': '💺',
  'usb charging ports': '🔌',
  'charging ports': '🔌',
  'snack or refreshment stops': '🥤',
  'refreshment stops': '🥤',
  'luggage space': '🧳',
  'pet friendly': '🐾', // Example
  'wheelchair accessible': '♿', // Example
};

// Function to get an emoji for an amenity
const getAmenityIcon = (name, iconProp) => {
  if (iconProp) {
    // If an icon is explicitly provided via props (e.g., from DB later), use it
    // This part needs implementation based on how icons are stored/rendered
    return <span className="mr-2">{/* Custom icon rendering based on iconProp */}</span>;
  }
  
  const lowerCaseName = name.toLowerCase().trim();
  const emoji = amenityEmojiMap[lowerCaseName];
  
  if (emoji) {
    return <span className="mr-2 text-xl" aria-hidden="true">{emoji}</span>;
  }
  
  // Fallback to checkmark if no specific emoji found
  return <CheckIcon />;
};

/**
 * Displays a grid of amenities with icons.
 * 
 * Props:
 * - amenities: An array of amenity objects, expected format: [{ name: string, icon?: string }, ...]
 */
export default function AmenitiesTable({ amenities }) {
  // Return null if amenities array is empty or not provided
  if (!amenities || amenities.length === 0) {
    return null; 
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Amenities</h2>
      {/* Updated grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        {amenities.map((amenity, index) => (
          <div key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300" title={amenity.name}> {/* Added title for tooltip */}
            {getAmenityIcon(amenity.name, amenity.icon)}
            <span className="truncate">{amenity.name}</span> {/* Added truncate in case names are long */}
          </div>
        ))}
      </div>
    </div>
  );
}
