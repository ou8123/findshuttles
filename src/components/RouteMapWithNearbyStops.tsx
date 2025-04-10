'use client';

import { useState } from 'react';
import RouteMap from './RouteMap';
import PossibleNearbyStops, { NearbyStop } from './PossibleNearbyStops';
import { WaypointStop } from '@/lib/aiWaypoints';

interface RouteMapWithNearbyStopsProps {
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
  possibleNearbyStops: NearbyStop[];
  waypoints?: WaypointStop[] | null;
  isTourRoute?: boolean;
}

export default function RouteMapWithNearbyStops({
  departureLat,
  departureLng,
  destinationLat,
  destinationLng,
  possibleNearbyStops,
  waypoints,
  isTourRoute = false,
}: RouteMapWithNearbyStopsProps) {
  // State for nearby stops interaction
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [clickedStopIndex, setClickedStopIndex] = useState<number | null>(null);

  // Handler for stop clicks
  const handleStopClick = (index: number) => {
    console.log(`Stop ${index} clicked!`);
    setClickedStopIndex(index);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Map takes up more space (left side) */}
      <div className="flex-1 min-h-[400px]">
        <RouteMap
          departureLat={departureLat}
          departureLng={departureLng}
          destinationLat={destinationLat}
          destinationLng={destinationLng}
          waypoints={waypoints}
          possibleNearbyStops={possibleNearbyStops}
          isTourRoute={isTourRoute}
        />
      </div>

      {/* Nearby stops list (right side) */}
      <div className="w-full md:w-1/3">
        <PossibleNearbyStops
          nearbyStops={possibleNearbyStops}
          hoveredId={hoveredStopId}
          setHoveredId={setHoveredStopId}
          onStopClick={handleStopClick}
        />
      </div>
    </div>
  );
}
