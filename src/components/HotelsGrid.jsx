// @ts-nocheck
// Disable TypeScript checking for this file

import React from 'react';

/**
 * Displays a grid of hotel names served by a route.
 * 
 * Props:
 * - hotels: An array of hotel objects, expected format: [{ name: string }, ...]
 */
export default function HotelsGrid({ hotels }) {
  // Return null if hotels array is empty or not provided
  if (!hotels || hotels.length === 0) {
    return null; 
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">🏨 Hotels Served</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        {hotels.map((hotel, index) => (
          <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
            {/* Basic checkmark or bullet point */}
            <span className="mr-2 text-green-600 dark:text-green-400">✓</span> 
            {hotel.name}
          </div>
        ))}
      </div>
    </div>
  );
}
