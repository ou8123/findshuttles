// components/MapWithWaypoints.tsx
'use client';

import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api'; // Added Polyline
import { Waypoint } from '@/types/common'; // Import the Waypoint type
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'; // Added more hooks

// Helper function to get the marker label (A-H, 1-8) based on index
// (Copied from WaypointList.tsx for consistency)
const getMarkerLabel = (index: number): string => {
  const clampedIndex = Math.min(index, 15); // Max 16 markers (0-15)
  if (clampedIndex < 8) {
    // A-H for indices 0-7
    return String.fromCharCode(65 + clampedIndex); // 65 is ASCII for 'A'
  } else {
    // 1-8 for indices 8-15
    return (clampedIndex - 8 + 1).toString();
  }
};

export default function MapWithWaypoints({
  waypoints,
  hoveredId,
  // Destructure the newly added props here
  departureLat,
  departureLng,
  destinationLat,
  destinationLng,
  isTourRoute,
  // Add clickedWaypointIndex to destructuring
  clickedWaypointIndex, 
}: {
  waypoints: Waypoint[];
  hoveredId: string | null;
  departureLat: number;
  departureLng: number;
  destinationLat: number;
  destinationLng: number;
  isTourRoute: boolean;
  // Add prop for clicked index
  clickedWaypointIndex: number | null; 
}) {
  // --- HOOKS ---
  // Must be called unconditionally at the top level

  // State for directions and polyline
  const [error, setError] = useState<string | null>(null);
  const [directionsResult, setDirectionsResult] = useState<any | null>(null); // Raw response
  const [decodedPath, setDecodedPath] = useState<google.maps.LatLng[]>([]);
  const requestMadeRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null); // Ref to map instance
  // Ref to store marker instances
  const markerRefs = useRef<(google.maps.Marker | null)[]>([]); 

  // Define the required libraries consistently with RouteMap
  const libraries: ("places" | "geometry" | "maps")[] = ['places', 'geometry', 'maps'];

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries, // Use the defined libraries array
    version: "weekly", // Match version if specified elsewhere
  });

  // Calculate center (can use useMemo or simple calculation)
  // Using useMemo here is fine as it's before the conditional return
  const center = useMemo(() => (
    waypoints.length > 0
      ? { lat: waypoints[0].lat, lng: waypoints[0].lng }
      : { lat: 0, lng: 0 } // Default center if no waypoints
  ), [waypoints]); // Dependency: waypoints

  // --- Fetch Directions logic (copied from RouteMap.tsx) ---
  // useCallback is a hook, must be at top level
  const fetchDirections = useCallback(async () => {
    if (!isLoaded) return;
    if (requestMadeRef.current) return;
    requestMadeRef.current = true;

    try {
      const origin = `${departureLat},${departureLng}`;
      // Use original destination for API call, backend handles tour logic
      const destination = `${destinationLat},${destinationLng}`; 
      const params = new URLSearchParams({ origin, destination });

      if (waypoints && waypoints.length > 0) {
        const waypointsString = JSON.stringify(waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })));
        params.append('waypoints', waypointsString);
      }
      if (isTourRoute) {
        params.append('isTour', 'true');
      }

      const apiUrl = `/api/routes/get-directions?${params.toString()}`;
      console.log(`[MapWithWaypoints] Attempting directions fetch: ${apiUrl}`);
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        console.error(`[MapWithWaypoints] Directions fetch failed: ${response.status}`, data);
        setError(data.error || `Failed to fetch directions: ${response.statusText}`);
        setDirectionsResult(null);
        setDecodedPath([]);
      } else {
        console.log("[MapWithWaypoints] Directions fetch successful (raw):", data);
        if (data && data.routes && data.routes.length > 0) {
          setDirectionsResult(data);
          setError(null);
          if (data.routes[0]?.overview_polyline?.points) {
            if (window.google?.maps?.geometry?.encoding) {
              try {
                const path = window.google.maps.geometry.encoding.decodePath(data.routes[0].overview_polyline.points);
                setDecodedPath(path);
                console.log("[MapWithWaypoints] Decoded polyline path:", path);
              } catch (decodeError: any) {
                console.error("[MapWithWaypoints] Error decoding polyline:", decodeError);
                setError("Failed to decode route path.");
                setDecodedPath([]);
              }
            } else {
               console.error("[MapWithWaypoints] Geometry library not loaded.");
               setError("Failed to decode route path (lib missing).");
               setDecodedPath([]);
            }
          } else {
            console.error("[MapWithWaypoints] Overview polyline missing.");
            // Don't set error here, maybe just no route found by API
            setDecodedPath([]);
          }
        } else {
          console.error("[MapWithWaypoints] Invalid directions response:", data);
          setError("Received invalid directions data.");
          setDirectionsResult(null);
          setDecodedPath([]);
        }
      }
    } catch (err: any) {
      console.error('[MapWithWaypoints] Error fetching directions:', err);
      setError(err.message || "Failed to fetch directions.");
      setDirectionsResult(null);
      setDecodedPath([]);
    }
  }, [isLoaded, departureLat, departureLng, destinationLat, destinationLng, waypoints, isTourRoute]);

  // --- Effect to trigger directions fetch ---
  // useEffect is a hook, must be at top level
  useEffect(() => {
    if (isLoaded && !requestMadeRef.current && departureLat && departureLng) {
       console.log("[MapWithWaypoints] Map loaded, triggering fetchDirections.");
       fetchDirections();
    }
  }, [isLoaded, fetchDirections, departureLat, departureLng]); // Simplified dependencies

  // Store map instance on load
  // useCallback is a hook, must be at top level
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    console.log("[MapWithWaypoints] Map instance stored.");
  }, []);

   // Effect to fit bounds when path is ready
   // useEffect is a hook, must be at top level
   useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps || decodedPath.length === 0) {
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    decodedPath.forEach(point => bounds.extend(point));
    // Also include waypoints in bounds calculation
    waypoints?.forEach(wp => bounds.extend(new window.google.maps.LatLng(wp.lat, wp.lng)));
    
    // Add padding to the bounds
    map.fitBounds(bounds, 50); // 50px padding
    console.log("[MapWithWaypoints] Effect: Fitted map bounds to polyline/waypoints.");

  }, [decodedPath, mapRef, waypoints]); // Rerun when path or waypoints change

  // Effect to handle panning and bouncing when a waypoint is clicked in the list
  useEffect(() => {
    if (clickedWaypointIndex === null || !mapRef.current || !window.google || !window.google.maps) {
      return; // Do nothing if no index is clicked or map/API not ready
    }

    const marker = markerRefs.current[clickedWaypointIndex];
    const waypoint = waypoints[clickedWaypointIndex];
    const map = mapRef.current;

    if (marker && waypoint && map) {
      console.log(`[MapWithWaypoints] Animating/Panning to waypoint index ${clickedWaypointIndex}`);
      
      // Pan map to the marker
      map.panTo({ lat: waypoint.lat, lng: waypoint.lng });

      // Start bounce animation
      marker.setAnimation(window.google.maps.Animation.BOUNCE);

      // Stop bounce animation after a short duration (e.g., 750ms)
      const bounceTimeout = setTimeout(() => {
        marker.setAnimation(null);
      }, 750); // Duration of one bounce cycle

      // Cleanup timeout on unmount or if index changes
      return () => clearTimeout(bounceTimeout);
    }
  }, [clickedWaypointIndex, waypoints]); // Rerun when clicked index changes

  // --- Conditional Return for Loading State ---
  // Now that all hooks are called, we can have the conditional return
  if (!isLoaded) return <div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl"><p className="text-gray-500">Loading map...</p></div>;

  // --- Non-Hook Calculations ---
  // Determine zoom (simple calculation, not a hook)
  const zoom = waypoints.length > 1 ? 9 : 12; // Zoom out more if multiple waypoints

  // --- Render Logic ---
  return (
    <GoogleMap
      mapContainerClassName="w-full h-96 rounded-xl"
      center={center} // Initial center
      zoom={zoom} // Initial zoom
      onLoad={onMapLoad} // Store map instance
      options={{ // Disable some controls for cleaner look
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
      }}
    >
      {/* Render Polyline */}
      {decodedPath.length > 0 && (
        <Polyline
          path={decodedPath}
          options={{
            strokeColor: '#4A90E2', // Blue color for the route
            strokeOpacity: 0.8,
            strokeWeight: 6,
          }}
        />
      )}

      {/* Render Markers */}
      {waypoints.map((wp, index) => (
        <Marker
          key={wp.id ?? `marker-${index}`} // Use index as fallback key
          position={{ lat: wp.lat, lng: wp.lng }}
          title={wp.name} // Show full name on hover
          // Store marker instance in ref array
          onLoad={(marker) => {
            markerRefs.current[index] = marker;
          }}
          // Add default label back
          label={getMarkerLabel(index)} 
          // Optional: Highlight default marker on hover
          // icon={hoveredId === wp.id ? { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' } : undefined}
        />
      ))}
    </GoogleMap>
  );
}
