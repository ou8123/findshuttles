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
import { NearbyStop } from './PossibleNearbyStops';

// Use the actual google.maps type for the final state
type ClientDirectionsResult = google.maps.DirectionsResult;

interface RouteMapProps {
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
  waypoints?: WaypointStop[] | null; // Array of { lat: number, lng: number } or null/undefined
  possibleNearbyStops?: NearbyStop[] | null;
  isTourRoute?: boolean;
  onNearbyStopMarkerClick?: (index: number) => void; // Callback for marker clicks
  activeNearbyStopIndex?: number | null; // Index of the currently active/clicked stop
}

// Define the required libraries - ensure 'maps' is included
const libraries: ("places" | "geometry" | "maps")[] = ['places', 'geometry', 'maps'];

const RouteMap: React.FC<RouteMapProps> = ({
  departureLat,
  departureLng,
  destinationLat,
  destinationLng,
  waypoints,
  possibleNearbyStops,
  isTourRoute = false,
  onNearbyStopMarkerClick,
  activeNearbyStopIndex,
}) => {
  // Log received props at the beginning
  console.log('[RouteMap Props Received]', { departureLat, departureLng, destinationLat, destinationLng, waypoints, possibleNearbyStops, isTourRoute, activeNearbyStopIndex });

  const [error, setError] = useState<string | null>(null);
  // State to hold the raw directions result from the API
  const [directionsResult, setDirectionsResult] = useState<any | null>(null); // Use 'any' for now, or a more specific raw type
  // State to hold the decoded polyline path
  const [decodedPath, setDecodedPath] = useState<google.maps.LatLng[]>([]);
  const requestMadeRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const nearbyStopMarkerRefs = useRef<(google.maps.Marker | null)[]>([]);
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

      // Log waypoints just before the check
      console.log('[RouteMap fetchDirections] Waypoints before check:', waypoints);

      // Always add waypoints if they exist, regardless of isTourRoute
      // The backend API will decide how to use them based on the isTour flag
      if (waypoints && waypoints.length > 0) {
        // Server expects JSON string of {lat, lng} array
        const waypointsString = JSON.stringify(waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })));
        params.append('waypoints', waypointsString);
        console.log('[RouteMap] Appending waypoints parameter:', waypointsString); // Log added
      } else {
        console.log('[RouteMap] No waypoints provided or waypoints array is empty.'); // Updated log
      }

      // Add isTour parameter if applicable
      if (isTourRoute) {
        params.append('isTour', 'true');
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
  }, [isLoaded, departureLat, departureLng, destinationLat, destinationLng, waypoints, isTourRoute]); // Add isTourRoute dependency

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

  // useEffect to adjust map view primarily when the route path is decoded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) {
      console.log("Map or Google Maps API not ready for bounds adjustment.");
      return;
    }

    // Fit bounds primarily when the path is decoded
    if (decodedPath.length > 0) {
      console.log("[RouteMap fitBounds Effect] Path decoded, calculating bounds...");
      const bounds = new window.google.maps.LatLngBounds();
      // Extend bounds for the route path itself
      decodedPath.forEach(point => bounds.extend(point));
      // Extend bounds for explicit waypoints
      waypoints?.forEach(wp => bounds.extend(new window.google.maps.LatLng(wp.lat, wp.lng)));
      // Extend bounds for nearby stops *if they exist at this time*
      // This ensures they are included in the initial view if available,
      // but changes to nearby stops alone won't re-trigger this effect.
      possibleNearbyStops?.forEach(stop => bounds.extend(new window.google.maps.LatLng(stop.lat, stop.lng)));

      try {
        console.log("[RouteMap fitBounds Effect] Attempting map.fitBounds...");
        // Use fitBounds without padding to zoom as close as possible while showing everything
        map.fitBounds(bounds);
        console.log("[RouteMap fitBounds Effect] Successfully fitted map bounds to path, waypoints, and nearby stops (if present).");
      } catch (fitBoundsError: any) {
         console.error("[RouteMap fitBounds Effect] Error calling map.fitBounds:", fitBoundsError);
         // Fallback: center on the start point if fitBounds fails
         map.setCenter({ lat: departureLat, lng: departureLng });
         map.setZoom(10); // Reasonable zoom level
      }

    } else if (!directionsResult && !error) { // Initial load before fetch or if reset
       console.log("[RouteMap fitBounds Effect] Initial load, setting center and zoom.");
       map.setCenter(center);
       map.setZoom(8);
    } else if (error || (directionsResult && decodedPath.length === 0)) { // On error or if fetch succeeded but no path
       console.log("[RouteMap fitBounds Effect] Error or no path, fitting bounds to start/end/waypoints/nearbystops as fallback.");
       const bounds = new window.google.maps.LatLngBounds();
       bounds.extend(new window.google.maps.LatLng(departureLat, departureLng));
       bounds.extend(new window.google.maps.LatLng(destinationLat, destinationLng));
       waypoints?.forEach(wp => bounds.extend(new window.google.maps.LatLng(wp.lat, wp.lng)));
       // Include nearby stops in fallback bounds calculation as well
       possibleNearbyStops?.forEach(stop => bounds.extend(new window.google.maps.LatLng(stop.lat, stop.lng)));
       try {
         console.log("[RouteMap fitBounds Effect] Attempting map.fitBounds (fallback)...");
         map.fitBounds(bounds);
         console.log("[RouteMap fitBounds Effect] Successfully fitted map bounds (fallback).");
       } catch (fitBoundsError: any) {
         console.error("[RouteMap fitBounds Effect] Error calling map.fitBounds (fallback):", fitBoundsError);
         // Fallback: center on the start point if fitBounds fails
         map.setCenter({ lat: departureLat, lng: departureLng });
         map.setZoom(10);
       }
    }
    // Dependencies: Run primarily when path changes, or on error/reset, or if core route points change.
    // Crucially, `possibleNearbyStops` is removed to prevent re-fitting just for them.
  }, [decodedPath, mapRef, center, directionsResult, error, departureLat, departureLng, destinationLat, destinationLng, waypoints, isTourRoute]); // Removed possibleNearbyStops, kept isTourRoute as it affects markers
  
  // Effect to handle animation of the active nearby stop marker (controlled by parent)
  useEffect(() => {
    if (activeNearbyStopIndex === null || !mapRef.current || !window.google || !window.google.maps) {
      return;
    }
    
    // Ensure activeNearbyStopIndex is a valid number before using it as an index
    if (typeof activeNearbyStopIndex !== 'number') {
        console.warn("[RouteMap Animation Effect] activeNearbyStopIndex is not a number:", activeNearbyStopIndex);
        return;
    }

    const marker = nearbyStopMarkerRefs.current[activeNearbyStopIndex];
    const stop = possibleNearbyStops?.[activeNearbyStopIndex];
    const map = mapRef.current;

    if (marker && stop && map) {
      console.log(`[RouteMap] Animating/Panning to nearby stop index ${activeNearbyStopIndex}`);

      // Pan map to the marker
      map.panTo({ lat: stop.lat, lng: stop.lng });

      // Start bounce animation
      marker.setAnimation(window.google.maps.Animation.BOUNCE);

      // Stop bounce animation after a short duration
      const bounceTimeout = setTimeout(() => {
        marker.setAnimation(null);
      }, 750);

      // Cleanup timeout on unmount or if index changes
      return () => clearTimeout(bounceTimeout);
    }
  }, [activeNearbyStopIndex, possibleNearbyStops]); // Rerun when active index changes


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
        {/* End Marker (only show if NOT a tour route) */}
        {!isTourRoute && (
          <Marker position={{ lat: destinationLat, lng: destinationLng }} label="B" />
        )}
        {/* Waypoint Markers */}
        {waypoints && waypoints.map((wp, index) => (
            <Marker key={`wp-${index}`} position={{ lat: wp.lat, lng: wp.lng }} label={`${index + 1}`} />
        ))}
        
        {/* Nearby Stops Markers - with distinct styling */}
        {possibleNearbyStops && possibleNearbyStops.map((stop, index) => (
          <Marker
            key={`nearby-${index}`}
            position={{ lat: stop.lat, lng: stop.lng }}
            label={`${index + 1}`} // Use simple number label
            // Removed icon and labelOrigin props to use default marker style
            onLoad={(marker) => {
              nearbyStopMarkerRefs.current[index] = marker;
            }}
            onClick={() => onNearbyStopMarkerClick?.(index)} // Call handler passed from parent
            title={stop.name}
            animation={activeNearbyStopIndex === index ? google.maps.Animation.BOUNCE : undefined} // Use prop for animation
          />
        ))}
      </GoogleMap>
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders if props haven't changed
export default React.memo(RouteMap);
