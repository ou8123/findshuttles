"use client";

import React from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF as Marker,
  DirectionsRenderer,
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
  const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const requestMadeRef = React.useRef(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
  });

  // Calculate map center
  const center = React.useMemo(() => ({
    lat: (departureLat + destinationLat) / 2,
    lng: (departureLng + destinationLng) / 2,
  }), [departureLat, destinationLat, departureLng, destinationLng]);

  // Define map container style
  const containerStyle = React.useMemo(() => ({
    width: '100%',
    height: '400px',
    borderRadius: '8px',
  }), []);

  // Create bounds for the map
  const bounds = React.useMemo(() => {
    if (!isLoaded) return null;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(new window.google.maps.LatLng(departureLat, departureLng));
    bounds.extend(new window.google.maps.LatLng(destinationLat, destinationLng));
    return bounds;
  }, [isLoaded, departureLat, departureLng, destinationLat, destinationLng]);

  // Function to fetch directions
  const fetchDirections = React.useCallback(async () => {
    if (!isLoaded) return;

    try {
      const directionsService = new google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: { lat: departureLat, lng: departureLng },
        destination: { lat: destinationLat, lng: destinationLng },
        travelMode: google.maps.TravelMode.DRIVING,
      });

      setDirections(result);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching directions:', err);
      setError("Unable to fetch route. Using simplified route display.");
    }
  }, [isLoaded, departureLat, departureLng, destinationLat, destinationLng]);

  // Effect to handle directions request
  React.useEffect(() => {
    if (!isLoaded || requestMadeRef.current) return;
    requestMadeRef.current = true;
    fetchDirections();
    return () => {
      requestMadeRef.current = false;
    };
  }, [isLoaded, fetchDirections]);

  if (loadError) {
    console.error("Map load error:", loadError);
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        Error loading map. Please check your internet connection and try again.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-50 border border-gray-200 rounded">
        <div className="text-gray-600">Loading Map...</div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="text-amber-600 text-sm mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={8}
        onLoad={(map) => {
          if (bounds) map.fitBounds(bounds);
        }}
      >
        {!directions && (
          <>
            <Marker
              position={{ lat: departureLat, lng: departureLng }}
              label="A"
            />
            <Marker
              position={{ lat: destinationLat, lng: destinationLng }}
              label="B"
            />
          </>
        )}
        {directions && (
          <DirectionsRenderer
            options={{
              directions: directions,
              suppressMarkers: false
            }}
          />
        )}
      </GoogleMap>
    </>
  );
};

export default RouteMap;
