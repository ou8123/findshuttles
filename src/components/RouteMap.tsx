"use client";

import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF as Marker } from '@react-google-maps/api'; // Use MarkerF for functional component compatibility

interface RouteMapProps {
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
}

// Define libraries for Google Maps API (can be defined globally or per component)
const libraries: ("places")[] = ['places']; // May not strictly need 'places' here, but doesn't hurt

const RouteMap: React.FC<RouteMapProps> = ({
  departureLat,
  departureLng,
  destinationLat,
  destinationLng,
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
  });

  // Calculate map center and bounds
  const center = {
    lat: (departureLat + destinationLat) / 2,
    lng: (departureLng + destinationLng) / 2,
  };

  // Define map container style
  const containerStyle = {
    width: '100%',
    height: '400px', // Adjust height as needed
    borderRadius: '8px', // Optional styling
  };

  // Render loading/error states or the map
  if (loadError) {
    console.error("Map load error:", loadError);
    return <div>Error loading map. Please check API key and configuration.</div>;
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  // Create LatLngBounds object to fit markers
  const bounds = new window.google.maps.LatLngBounds();
  bounds.extend(new window.google.maps.LatLng(departureLat, departureLng));
  bounds.extend(new window.google.maps.LatLng(destinationLat, destinationLng));

  return (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center} // Center might be adjusted by bounds
        zoom={8} // Initial zoom, will be adjusted by bounds
        onLoad={(map) => {
            // Fit map to bounds after loading
            map.fitBounds(bounds);
            // Add padding if needed so markers aren't right at the edge
            // map.panToBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
        }}
      >
        {/* Departure Marker */}
        <Marker
          position={{ lat: departureLat, lng: departureLng }}
          label="A" // Label for departure
        />
        {/* Destination Marker */}
        <Marker
          position={{ lat: destinationLat, lng: destinationLng }}
          label="B" // Label for destination
        />
        {/* Optional: Add DirectionsRenderer here later if needed */}
      </GoogleMap>
  );
};

export default RouteMap;