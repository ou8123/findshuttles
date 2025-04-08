// components/ItinerarySection.tsx
'use client';

import { useState } from 'react';
import MapWithWaypoints from './MapWithWaypoints';
import WaypointList from './WaypointList';
import { Waypoint } from '@/types/common'; // Import the Waypoint type

// Define props including the dynamic title and direction info
interface ItinerarySectionProps {
  waypoints: Waypoint[];
  title: string; 
  // Add props needed for directions API call
  departureCity: { latitude?: number | null; longitude?: number | null };
  destinationCity: { latitude?: number | null; longitude?: number | null };
  isTourRoute: boolean;
}

export default function ItinerarySection({ 
  waypoints, 
  title, 
  departureCity, 
  destinationCity, 
  isTourRoute 
}: ItinerarySectionProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Add state to track the index of the clicked waypoint
  const [clickedWaypointIndex, setClickedWaypointIndex] = useState<number | null>(null);

  // Handler function to update the clicked index state
  const handleWaypointClick = (index: number) => {
    console.log(`[ItinerarySection] Waypoint ${index} clicked.`);
    setClickedWaypointIndex(index);
    // Optional: Reset hover state when clicking
    setHoveredId(null); 
  };

  // Ensure waypoints is an array and has items before rendering
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    // Optionally return null or a message if no waypoints are provided
    // console.warn("ItinerarySection: No waypoints provided.");
    return null; 
  }

  return (
    <section className="mt-10 mb-8"> {/* Added mb-8 for spacing */}
      {/* Render the dynamic title */}
      <h2 className="text-2xl font-semibold mb-4">{title}</h2> 
      {/* Removed the static description paragraph */}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Map takes up more space (Ensuring it's on the left) */}
        <div className="flex-1 min-h-[384px]"> 
          <MapWithWaypoints 
            waypoints={waypoints} 
            hoveredId={hoveredId} 
            // Pass down props needed for directions
            departureLat={departureCity?.latitude ?? 0} 
            departureLng={departureCity?.longitude ?? 0}
            destinationLat={destinationCity?.latitude ?? 0}
            destinationLng={destinationCity?.longitude ?? 0}
            isTourRoute={isTourRoute}
            // Pass down the clicked index
            clickedWaypointIndex={clickedWaypointIndex} 
          />
        </div>
        {/* List takes up 1/3 on medium screens and up (Ensuring it's on the right) */}
        <div className="w-full md:w-1/3">
          <WaypointList 
            waypoints={waypoints} 
            hoveredId={hoveredId} 
            setHoveredId={setHoveredId} 
            // Pass down the click handler
            onWaypointClick={handleWaypointClick} 
          />
        </div>
      </div>
    </section>
  );
}
