"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF as Marker,
  Polyline,
} from '@react-google-maps/api';

interface RouteMapProps {
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
}

const libraries: ("places" | "geometry")[] = ['places', 'geometry']; 

interface DirectionsData {
  overview_polyline?: string;
  bounds?: google.maps.LatLngBoundsLiteral; 
}

const RouteMap: React.FC<RouteMapProps> = ({
  departureLat,
  departureLng,
  destinationLat,
  destinationLng,
}) => {
  // --- Hooks called unconditionally at the top level ---
  const [path, setPath] = useState<google.maps.LatLng[] | null>(null); 
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestMadeRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null); 
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
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

  const fetchDirectionsData = useCallback(async () => {
    if (!isLoaded || !window.google?.maps?.geometry?.encoding) { 
        console.warn("Google Maps API or geometry library not loaded yet.");
        setError("Map components not fully loaded yet."); 
        return; 
    }

    const apiUrl = `/api/routes/directions?origin=${departureLat},${departureLng}&destination=${destinationLat},${destinationLng}`;

    try {
      console.log(`Fetching directions data from backend: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch directions: ${response.status}`);
      }
      
      const data: DirectionsData = await response.json();
      console.log("Received data from backend:", data); 
      
      if (data.overview_polyline) {
        const decodedPath = window.google.maps.geometry.encoding.decodePath(data.overview_polyline);
        setPath(decodedPath);
        console.log("Successfully decoded polyline.");
      } else {
         console.warn("No overview_polyline found in response.");
         setError("Route path could not be determined.");
         setPath(null);
      }

      if (data.bounds) {
         setMapBounds(data.bounds);
         console.log("Using bounds from directions response.");
      } else {
         const fallbackBounds = new window.google.maps.LatLngBounds();
         fallbackBounds.extend(new window.google.maps.LatLng(departureLat, departureLng));
         fallbackBounds.extend(new window.google.maps.LatLng(destinationLat, destinationLng));
         setMapBounds(fallbackBounds.toJSON()); 
         console.log("Using calculated fallback bounds.");
      }
      setError(null); 
    } catch (err) {
      console.error('Error fetching or processing directions data:', err);
      let message = "Unable to fetch route details. Displaying markers only.";
      if (err instanceof Error) {
          message = err.message; 
      }
      setError(message);
      setPath(null); 
      setMapBounds(null); 
    }
  }, [isLoaded, departureLat, departureLng, destinationLat, destinationLng]);

  useEffect(() => {
    if (isLoaded && window.google?.maps?.geometry?.encoding && !requestMadeRef.current) { 
      requestMadeRef.current = true;
      fetchDirectionsData();
    }
    return () => {
      requestMadeRef.current = false; 
    };
  }, [isLoaded, fetchDirectionsData]); 

  // Simplified onLoad - just store the map instance
  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    console.log("Map instance stored.");
  };

  // Effect to fit bounds - runs only when mapRef or mapBounds changes
  useEffect(() => {
    // Ensure map instance and bounds are available
    if (mapRef.current && mapBounds) { 
      console.log("Attempting to fit bounds:", mapBounds);
      try {
        // Check if mapBounds is a valid LatLngBoundsLiteral
        if (mapBounds.north !== undefined && mapBounds.south !== undefined && mapBounds.east !== undefined && mapBounds.west !== undefined) {
          const bounds = new window.google.maps.LatLngBounds(mapBounds); 
          mapRef.current.fitBounds(bounds);
          console.log("Map bounds fitted via useEffect.");
        } else {
           console.warn("mapBounds state is not a valid LatLngBoundsLiteral:", mapBounds);
           // Fallback if bounds are invalid
           mapRef.current.setCenter(center);
           mapRef.current.setZoom(8);
        }
      } catch (e) {
         console.error("Error fitting bounds:", e);
         mapRef.current.setCenter(center);
         mapRef.current.setZoom(8);
      }
    } 
    // Removed the else block that centered map if bounds were null, 
    // as initial center/zoom on GoogleMap component should handle this.
  }, [mapBounds, center]); // Depend on mapBounds and center

  // --- Conditional returns MUST come AFTER all hook calls ---
  if (loadError) {
    console.error("Map load error:", loadError);
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        Error loading map. Please check your API key and internet connection.
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

  // --- Render logic ---
  return (
    <>
      {error && (
        <div className="text-amber-600 text-sm mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center} // Initial center
        zoom={8}      // Initial zoom
        onLoad={onMapLoad} // Store map instance
        // Let the useEffect handle fitting bounds
      >
        {/* Always show markers */}
        <Marker
          position={{ lat: departureLat, lng: departureLng }}
          label="A"
        />
        <Marker
          position={{ lat: destinationLat, lng: destinationLng }}
          label="B"
        />
        
        {/* Render Polyline if path is available */}
        {path && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#FF0000', // Red color for the route
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>
    </>
  );
};

export default RouteMap;
