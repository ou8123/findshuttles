"use client";


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF as Marker,
  Polyline, // Need Polyline for manual drawing
  // DirectionsRenderer, // No longer using this
} from '@react-google-maps/api';
import { WaypointStop } from '@/lib/aiWaypoints';

// Use the actual google.maps type for the final state
type ClientDirectionsResult = google.maps.DirectionsResult;

interface RouteMapProps {
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
  waypoints?: WaypointStop[] | null; // Array of { lat: number, lng: number } or null/undefined
}

const libraries: ("places" | "geometry")[] = ['places', 'geometry'];

const RouteMap: React.FC<RouteMapProps> = ({
  departureLat,
  departureLng,
  destinationLat,
  destinationLng,
  waypoints,
}) => {
  const [error, setError] = useState<string | null>(null);
  // State to hold the raw directions result from the API
  const [directionsResult, setDirectionsResult] = useState<any | null>(null); // Use 'any' for now, or a more specific raw type
  // State to hold the decoded polyline path
  const [decodedPath, setDecodedPath] = useState<google.maps.LatLng[]>([]);
  const requestMadeRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  // Use the FRONTEND key ONLY for loading the JS API (map display)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries,
    version: "weekly",
  });

  const center = useMemo(() => ({
    lat: (departureLat + destinationLat) / 2,
    lng: (departureLng + destinationLng) / 2,
  }), [departureLat, destinationLat, departureLng, destinationLng]);

  const containerStyle = useMemo(() => ({
    width: '100%',
    height: '400px',
    borderRadius: '8px',
  }), []);

  // --- Fetch Directions using SERVER-SIDE API endpoint ---
  const fetchDirections = useCallback(async () => {
    // Only need isLoaded to ensure map container is ready
    if (!isLoaded) {
      console.warn("Google Maps API not loaded yet for fetch trigger.");
      return;
    }
    // Prevent duplicate requests
    if (requestMadeRef.current) {
      console.log("Directions request already attempted via API.");
      return;
    }
    requestMadeRef.current = true; // Mark request as attempted

    try {
      const origin = `${departureLat},${departureLng}`;
      const destination = `${destinationLat},${destinationLng}`;
      const params = new URLSearchParams({ origin, destination });

      // Add waypoints if they exist
      if (waypoints && waypoints.length > 0) {
        // Server expects JSON string of {lat, lng} array
        const waypointsString = JSON.stringify(waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })));
        params.append('waypoints', waypointsString);
      }

      const apiUrl = `/api/routes/get-directions?${params.toString()}`;
      console.log(`Attempting server-side directions fetch: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        console.error(`Server-side Directions fetch failed. Status: ${response.status}`, data);
        setError(data.error || `Failed to fetch directions: ${response.statusText}`);
        setDirectionsResult(null); // Corrected state setter
        setDecodedPath([]);      // Clear path on error
      } else {
        console.log("Server-side Directions fetch successful (raw):", data);

        // Basic check for essential data
        if (data && data.routes && data.routes.length > 0) {
           // Store the raw result
           setDirectionsResult(data);
           setError(null);

           // Decode the polyline
           if (data.routes[0]?.overview_polyline?.points) {
             if (window.google?.maps?.geometry?.encoding) {
               try {
                 const path = window.google.maps.geometry.encoding.decodePath(data.routes[0].overview_polyline.points);
                 setDecodedPath(path);
                 console.log("Decoded polyline path:", path);
               } catch (decodeError: any) {
                 console.error("Error decoding polyline:", decodeError);
                 setError("Failed to decode route path.");
                 setDecodedPath([]);
               }
             } else {
               console.error("Google Maps geometry library not loaded for polyline decoding.");
               setError("Failed to decode route path.");
               setDecodedPath([]);
             }
           } else {
             console.error("Overview polyline missing in directions response.");
             setError("Could not find route path in response.");
             setDecodedPath([]);
           }
        } else {
          console.error("Server-side Directions response missing routes:", data);
          setError("Received invalid directions data from server.");
          setDirectionsResult(null); // Corrected state setter
          setDecodedPath([]);      // Clear path on error
        }
      }
    } catch (err: any) {
      console.error('Error fetching directions from API:', { error: err, message: err.message });
      setError(err.message || "Failed to fetch directions from server.");
      setDirectionsResult(null); // Corrected state setter
      setDecodedPath([]);
    }
  }, [isLoaded, departureLat, departureLng, destinationLat, destinationLng, waypoints]);

   // --- Effect to trigger directions fetch ---
   useEffect(() => {
     // Trigger fetch once the map API is loaded and coordinates are valid
     if (isLoaded && !requestMadeRef.current && departureLat && departureLng && destinationLat && destinationLng) {
       console.log("Map loaded, triggering fetchDirections via API.");
       fetchDirections();
     }
   }, [isLoaded, fetchDirections, departureLat, departureLng, destinationLat, destinationLng]); // Rerun if fetchDirections or coords change

  // Simplified onMapLoad just to store the map instance
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    console.log("Map instance stored.");
  }, []);

  // useEffect to adjust map view when decodedPath changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) {
      console.log("Map or Google Maps API not ready for bounds adjustment.");
      return;
    }

    // Fit bounds manually when path is decoded
    if (decodedPath.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      decodedPath.forEach(point => bounds.extend(point));
      // Add waypoints to bounds if they exist
      waypoints?.forEach(wp => bounds.extend(new window.google.maps.LatLng(wp.lat, wp.lng)));

      // Use fitBounds without padding to zoom as close as possible while showing everything
      map.fitBounds(bounds);
      console.log("Effect: Fitted map bounds to path and waypoints (no padding)");

    } else if (!directionsResult && !error) { // Initial load before fetch or if reset
       map.setCenter(center);
       map.setZoom(8);
       console.log("Effect: Set initial map center and zoom");
    } else if (error || (directionsResult && decodedPath.length === 0)) { // On error or if fetch succeeded but no path, fit to start/end/waypoints
       const bounds = new window.google.maps.LatLngBounds();
       bounds.extend(new window.google.maps.LatLng(departureLat, departureLng));
       bounds.extend(new window.google.maps.LatLng(destinationLat, destinationLng));
       waypoints?.forEach(wp => bounds.extend(new window.google.maps.LatLng(wp.lat, wp.lng)));
       map.fitBounds(bounds); // Use fitBounds here as a fallback for errors
       console.log("Effect: Fitted map bounds to start/end/waypoints due to error or missing path");
    }
  }, [decodedPath, mapRef, center, directionsResult, error, departureLat, departureLng, destinationLat, destinationLng, waypoints]); // Dependencies for the effect


  if (loadError) {
    console.error("Map load error:", loadError);
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        Error loading map components. Please check API key and internet connection.
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

  // Log state
  console.log("Rendering RouteMap. Decoded path length:", decodedPath.length, " Error:", error);

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
        zoom={8} // Initial zoom, will be overridden by fitBounds
        onLoad={onMapLoad}
        options={{
            mapTypeControl: false,
            streetViewControl: false
        }}
      >
        {/* Manual Polyline */}
        {decodedPath.length > 0 && (
          <Polyline
            path={decodedPath}
            options={{
              strokeColor: '#4A90E2',
              strokeOpacity: 0.9,
              strokeWeight: 5
            }}
          />
        )}

        {/* Manual Markers */}
        {/* Start Marker */}
        <Marker position={{ lat: departureLat, lng: departureLng }} label="A" />
        {/* End Marker */}
        <Marker position={{ lat: destinationLat, lng: destinationLng }} label="B" />
        {/* Waypoint Markers */}
        {waypoints && waypoints.map((wp, index) => (
            <Marker key={`wp-${index}`} position={{ lat: wp.lat, lng: wp.lng }} label={`${index + 1}`} />
        ))}
      </GoogleMap>
    </>
  );
};

export default RouteMap;
