"use client";

import React, { useState, useCallback, useEffect } from 'react'; // Added useEffect back
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF as Marker,
  // DirectionsService, // We will call the service programmatically
  DirectionsRenderer // Import DirectionsRenderer
} from '@react-google-maps/api';

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

  // State for directions result
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [travelTime, setTravelTime] = useState<string | null>(null); // State for travel time string

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
  });

  // Define origin and destination for DirectionsService
  const origin = { lat: departureLat, lng: departureLng };
  const destination = { lat: destinationLat, lng: destinationLng };

  // Calculate map center (can still be useful for initial load before directions)
  const center = {
    lat: (departureLat + destinationLat) / 2,
    lng: (departureLng + destinationLng) / 2,
  };

  // Callback function for DirectionsService
  const directionsCallback = useCallback((
    response: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (status === 'OK' && response) {
      console.log("Directions received:", response);
      setDirectionsResponse(response);
      // Extract travel time from the first route/leg
      const route = response.routes[0];
      if (route && route.legs[0] && route.legs[0].duration) {
        setTravelTime(route.legs[0].duration.text); // e.g., "4 hours 3 mins"
      }
    } else {
      console.error(`Directions request failed due to ${status}`);
      setTravelTime(null); // Clear travel time on error
    }
  }, []); // Empty dependency array as it doesn't depend on component state/props directly

  // Use useEffect to fetch directions when origin/destination change or map loads
  useEffect(() => {
    if (!isLoaded) return; // Wait for map script to load
    // Check for valid, non-zero coordinates before making the API call
    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
        console.log("Skipping directions fetch: Invalid coordinates.");
        setDirectionsResponse(null); // Clear previous directions if coords become invalid
        setTravelTime(null);
        return; 
    }

    console.log("Attempting to fetch directions..."); // Log before making the call
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      directionsCallback // Use the existing callback
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Trigger only on coordinate changes or load
  }, [isLoaded, origin.lat, origin.lng, destination.lat, destination.lng, directionsCallback]); // Add dependencies

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
    // Wrap everything in a single React Fragment
    <>
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

        {/* DirectionsService component removed, handled by useEffect */}


        {/* Directions Renderer - Displays the route */}
        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse,
              suppressMarkers: true, // Hide default A/B markers from renderer
              preserveViewport: true // Prevent renderer from changing map zoom/center
            }}
          />
        )}
      </GoogleMap>

      {/* Display Travel Time */}
      {travelTime && (
        <div className="mt-2 text-sm text-gray-600">
          Estimated travel time: {travelTime}
        </div>
      )}
    </> // Wrap in fragment as we now return multiple elements
  );
};

export default RouteMap;