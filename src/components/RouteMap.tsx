"use client";

import React from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF as Marker,
} from '@react-google-maps/api';

interface RouteMapProps {
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
}

const libraries: ("places")[] = ['places'];

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

  // Calculate map center
  const center = {
    lat: (departureLat + destinationLat) / 2,
    lng: (departureLng + destinationLng) / 2,
  };

  // Define map container style
  const containerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '8px',
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
      center={center}
      zoom={8}
      onLoad={(map) => {
        map.fitBounds(bounds);
      }}
    >
      {/* Departure Marker */}
      <Marker
        position={{ lat: departureLat, lng: departureLng }}
        label="A"
      />
      {/* Destination Marker */}
      <Marker
        position={{ lat: destinationLat, lng: destinationLng }}
        label="B"
      />
    </GoogleMap>
  );
};

export default RouteMap;