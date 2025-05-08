"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Amenity } from '@prisma/client';
import ContentEditorControls from '@/components/ContentEditorControls';
import { WaypointStop } from '@/lib/aiWaypoints';
import { NearbyStop } from '@/components/PossibleNearbyStops';
// DND Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/outline'; // For drag handle icon
import VideoGenerator from '@/components/admin/VideoGenerator';

interface City {
  id: string;
  name: string;
  country: {
    name: string;
  };
}

// Define type for route type state used in the form
type RouteType = 'airportPickup' | 'airportDropoff' | 'cityToCity' | 'privateDriver' | 'sightseeingShuttle';

// Updated interface to include new fields from the database
interface RouteData {
    id: string;
    departureCityId: string;
    destinationCityId: string;
    routeSlug: string;
    displayName: string;
    viatorWidgetCode: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    seoDescription?: string | null;
    additionalInstructions?: string | null;
    travelTime?: string | null;
    otherStops?: string | null;
    isAirportPickup: boolean;
    isAirportDropoff: boolean;
    isCityToCity: boolean;
    isPrivateDriver: boolean; // Added new flag
    isSightseeingShuttle: boolean; // Added new flag
    mapWaypoints?: WaypointStop[] | null; // Add mapWaypoints field
    possibleNearbyStops?: NearbyStop[] | null;
    viatorDestinationLink?: string | null; // Ensure this matches DB schema (String?)
    imagePublicIds?: string[]; // Added for video generation
    videoUrl?: string | null; // Added for video generation
    amenities: { id: string; name?: string }[]; // Include name if selected in API
    departureCity: { name: string; id: string };
    destinationCity: { name: string; id: string };
    // Add potentially missing relations if needed by the component
    departureCountry?: { name: string; slug: string };
    destinationCountry?: { name: string; slug: string };
}

const EditRoutePage = () => {
  const router = useRouter();
  const params = useParams();
  const routeId = params?.routeId as string;

  // Form state
  const [departureCityId, setDepartureCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [routeSlug, setRouteSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [viatorWidgetCode, setViatorWidgetCode] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [otherStops, setOtherStops] = useState('');
  const [routeType, setRouteType] = useState<RouteType>('cityToCity'); // State for route type flags
  const [originalData, setOriginalData] = useState<RouteData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]); // State to hold all amenities
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]); // State for selected amenity IDs
  const [mapWaypoints, setMapWaypoints] = useState<WaypointStop[]>([]); // State for waypoints
  const [possibleNearbyStops, setPossibleNearbyStops] = useState<NearbyStop[]>([]);
  const [viatorDestinationLink, setViatorDestinationLink] = useState(''); // ✅ New state for Viator link

  // State for city selection
  const [availableCities, setAvailableCities] = useState<City[]>([]);

  // Combined Loading/Error state for initial data fetches
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [pageLoadError, setPageLoadError] = useState<string | null>(null);

  // Loading/Submitting state for form actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);


  // Combined useEffect to fetch initial page data concurrently
  useEffect(() => {
    if (!routeId) {
      setPageLoadError("Route ID not found in URL.");
      setIsLoadingPageData(false);
      return;
    }

    const fetchInitialData = async () => {
      setIsLoadingPageData(true);
      setPageLoadError(null);

      try {
        console.log(`Fetching initial data for route ID: ${routeId}`);
        const [amenitiesResponse, citiesResponse, routeResponse] = await Promise.all([
          fetch('/api/admin/amenities'),
          fetch('/api/admin/cities?limit=9999'), // Fetch all cities
          fetch(`/api/admin/routes/${routeId}`)
        ]);

        // Check all responses before proceeding
        if (!amenitiesResponse.ok) throw new Error(`Failed to fetch amenities: ${amenitiesResponse.statusText}`);
        if (!citiesResponse.ok) throw new Error(`Failed to fetch cities: ${citiesResponse.statusText}`);
        if (!routeResponse.ok) {
            const errorData = await routeResponse.json().catch(() => ({ error: `HTTP error! status: ${routeResponse.status}` }));
            throw new Error(errorData.error || `Failed to fetch route: ${routeResponse.status}`);
        }

        // Process results after all promises resolve
        const amenitiesData = await amenitiesResponse.json();
        const citiesData = await citiesResponse.json();
        const routeData: RouteData = await routeResponse.json();

        // Validate route data
        if (!routeData || typeof routeData !== 'object' || !routeData.id) {
          throw new Error('Invalid route data received from API.');
        }

        // Set Amenities State
        const amenitiesArray = Array.isArray(amenitiesData?.amenities) ? amenitiesData.amenities : [];
        setAllAmenities(amenitiesArray);
        console.log("[DEBUG EditRoutePage] Fetched amenities data:", amenitiesArray.length);

        // Set Cities State
        const citiesArray = citiesData.cities || [];
        console.log("--- CITIES DATA RECEIVED FROM API ---"); // Log separator
        console.log("Total cities received:", citiesArray.length);
        console.log("Cities Array:", JSON.stringify(citiesArray, null, 2)); // Log the full array
        console.log("--- END CITIES DATA ---");
        setAvailableCities(citiesArray);
        // console.log("Fetched cities:", citiesArray.length); // Original log, commented out

        // Set Route State
        console.log("Successfully fetched route directly:", routeData);
        setOriginalData(routeData);
        setDepartureCityId(routeData.departureCityId);
        setDestinationCityId(routeData.destinationCityId);
        setRouteSlug(routeData.routeSlug);
        setDisplayName(routeData.displayName);
        setViatorWidgetCode(routeData.viatorWidgetCode);
        setMetaTitle(routeData.metaTitle ?? '');
        setMetaDescription(routeData.metaDescription ?? '');
        setMetaKeywords(routeData.metaKeywords ?? '');
        setSeoDescription(routeData.seoDescription ?? '');
        setTravelTime(routeData.travelTime ?? '');
        setOtherStops(routeData.otherStops ?? '');
        setAdditionalInstructions(routeData.additionalInstructions ?? '');
        setViatorDestinationLink(routeData.viatorDestinationLink ?? '');
        setMapWaypoints(Array.isArray(routeData.mapWaypoints) ? routeData.mapWaypoints : []);
        setPossibleNearbyStops(Array.isArray(routeData.possibleNearbyStops) ? routeData.possibleNearbyStops : []);
        setSelectedAmenityIds(routeData.amenities?.map(a => a.id) || []);

        // Set route type
        if (routeData.isAirportPickup) setRouteType('airportPickup');
        else if (routeData.isAirportDropoff) setRouteType('airportDropoff');
        else if (routeData.isPrivateDriver) setRouteType('privateDriver');
        else if (routeData.isSightseeingShuttle) setRouteType('sightseeingShuttle');
        else setRouteType('cityToCity');

      } catch (err: unknown) {
        console.error("Failed to fetch initial page data:", err);
        let message = "Could not load necessary page data. Please try again or contact support.";
        if (err instanceof Error) {
            message = err.message;
        }
        setPageLoadError(message); // Use combined error state
      } finally {
        setIsLoadingPageData(false); // Set combined loading state to false
      }
    };

    fetchInitialData();
  }, [routeId]); // Dependency array only includes routeId


  // Effect to clear mapWaypoints if route type changes to one that doesn't support them
  useEffect(() => {
    if (routeType === 'airportPickup' || routeType === 'airportDropoff' || routeType === 'cityToCity') {
      // Check if waypoints actually exist before clearing to avoid unnecessary state updates
      if (mapWaypoints.length > 0) {
         console.log(`Route type changed to ${routeType}, clearing existing mapWaypoints.`);
         setMapWaypoints([]);
      }
    }
    // This effect should run only when routeType changes
  }, [routeType]); // Dependency array includes routeType

  // --- Debug useEffect for selectedAmenityIds ---
  useEffect(() => {
    console.log("[DEBUG useEffect] selectedAmenityIds changed:", selectedAmenityIds);
  }, [selectedAmenityIds]);
  // --- End Debug useEffect ---

  // Helper to determine original route type for comparison
  const getOriginalRouteType = (): RouteType | null => {
    if (!originalData) return null;
    if (originalData.isAirportPickup) return 'airportPickup';
    if (originalData.isAirportDropoff) return 'airportDropoff';
    if (originalData.isPrivateDriver) return 'privateDriver';
    if (originalData.isSightseeingShuttle) return 'sightseeingShuttle';
    if (originalData.isCityToCity) return 'cityToCity';
    return 'cityToCity';
  };

  // Mark handleSubmit as async
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!departureCityId || !destinationCityId || !viatorWidgetCode || !routeSlug || !displayName) {
      setSubmitStatus({ success: false, message: 'All required fields must be filled out.' });
      return;
    }
    if (departureCityId === destinationCityId && routeType !== 'privateDriver' && routeType !== 'sightseeingShuttle') {
      setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same for this route type.' });
      return;
    }

    const currentMetaTitle = metaTitle.trim() === '' ? null : metaTitle.trim();
    const currentMetaDesc = metaDescription.trim() === '' ? null : metaDescription.trim();
    const currentMetaKeywords = metaKeywords.trim() === '' ? null : metaKeywords.trim();
    const currentSeoDesc = seoDescription.trim() === '' ? null : seoDescription.trim();
    const currentTravelTime = travelTime.trim() === '' ? null : travelTime.trim();
    const otherStopsAsString = Array.isArray(otherStops) ? otherStops.join(', ') : (otherStops || '');
    const currentOtherStops = otherStopsAsString.trim() === '' ? null : otherStopsAsString.trim();
    const currentIsAirportPickup = routeType === 'airportPickup';
    const currentIsAirportDropoff = routeType === 'airportDropoff';
    const currentIsCityToCity = routeType === 'cityToCity';
    const currentIsPrivateDriver = routeType === 'privateDriver';
    const currentIsSightseeingShuttle = routeType === 'sightseeingShuttle';

    if (!originalData) {
      setSubmitStatus({ success: false, message: 'Original route data not found.' });
      return;
    }

    const originalRouteType = getOriginalRouteType();
    const originalWaypointsForCompare = Array.isArray(originalData.mapWaypoints) ? originalData.mapWaypoints : [];
    const currentWaypointsForCompare = mapWaypoints;

    // Get original nearby stops for comparison
    const originalNearbyStopsForCompare = Array.isArray(originalData.possibleNearbyStops) ? originalData.possibleNearbyStops : [];
    const currentNearbyStopsForCompare = possibleNearbyStops;

    const originalAmenityIds = originalData.amenities?.map(a => a.id).sort() || [];
    const currentAmenityIds = [...selectedAmenityIds].sort();

    const waypointsCleared = (originalWaypointsForCompare.length > 0 && currentWaypointsForCompare.length === 0);
    const nearbyStopsCleared = (originalNearbyStopsForCompare.length > 0 && currentNearbyStopsForCompare.length === 0);

    // Check if amenities have changed
    const amenitiesChanged = JSON.stringify(originalAmenityIds) !== JSON.stringify(currentAmenityIds);

    // Check if nearby stops have changed
    const nearbyStopsChanged = JSON.stringify(originalNearbyStopsForCompare) !== JSON.stringify(currentNearbyStopsForCompare);

    const otherFieldsChanged = !(
        departureCityId === originalData.departureCityId &&
        destinationCityId === originalData.destinationCityId &&
        routeSlug === originalData.routeSlug &&
        displayName === originalData.displayName &&
        viatorWidgetCode === originalData.viatorWidgetCode &&
        currentMetaTitle === originalData.metaTitle &&
        currentMetaDesc === originalData.metaDescription &&
        currentMetaKeywords === originalData.metaKeywords &&
        currentSeoDesc === originalData.seoDescription &&
        currentTravelTime === originalData.travelTime &&
        currentOtherStops === originalData.otherStops &&
        (additionalInstructions.trim() || null) === originalData.additionalInstructions &&
        (viatorDestinationLink.trim() || null) === originalData.viatorDestinationLink && // ✅ Check Viator link change
        routeType === originalRouteType
    );

    const waypointsChanged = otherFieldsChanged ? true : (JSON.stringify(currentWaypointsForCompare) !== JSON.stringify(originalWaypointsForCompare));

    // Include amenity and nearby stops changes in the check
    if (!otherFieldsChanged && !waypointsChanged && !amenitiesChanged && !nearbyStopsChanged) {
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Use the PUT route handler which expects selectedAmenityIds
      const response = await fetch(`/api/admin/routes/${routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            departureCityId,
            destinationCityId,
            routeSlug,
            displayName,
            viatorWidgetCode,
            metaTitle: currentMetaTitle,
            metaDescription: currentMetaDesc,
            metaKeywords: currentMetaKeywords,
            seoDescription: currentSeoDesc,
            travelTime: currentTravelTime,
            otherStops: currentOtherStops,
            additionalInstructions: additionalInstructions.trim() || null,
            isAirportPickup: currentIsAirportPickup,
            isAirportDropoff: currentIsAirportDropoff,
            isCityToCity: currentIsCityToCity,
            isPrivateDriver: currentIsPrivateDriver,
            isSightseeingShuttle: currentIsSightseeingShuttle,
            mapWaypoints: mapWaypoints.length > 0 ? mapWaypoints : null,
            possibleNearbyStops: possibleNearbyStops.length > 0 ? possibleNearbyStops : null,
            viatorDestinationLink: viatorDestinationLink.trim() || null, // ✅ Send Viator link
            selectedAmenityIds: selectedAmenityIds // Send selected amenity IDs
         }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      setSubmitStatus({ success: true, message: `Route updated successfully!` });

      // Update original data state using the actual data returned from the API
      // This ensures the state reflects exactly what was saved, including the viator link
      setOriginalData(prevData => ({
        ...(prevData || {}), // Keep existing fields if any were missing in result
        ...result, // Overwrite with the successfully saved data from API
        // Ensure nested objects are handled correctly if API select differs
        amenities: result.amenities || [],
        // Manually reconstruct departure/destination city if not fully included in result's select
        // (They should be included based on routeSelect in the API)
        departureCity: result.departureCity || prevData?.departureCity || { name: '', id: ''},
        destinationCity: result.destinationCity || prevData?.destinationCity || { name: '', id: ''},
      }) as RouteData); // Cast result back to RouteData type

    } catch (error: unknown) {
      console.error("Failed to update route:", error);
      let message = "Failed to update route.";
      if (error instanceof Error) {
          message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
   };

  // Handler for amenity checkbox changes
  const handleAmenityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedAmenityIds(prev =>
      checked ? [...prev, value] : prev.filter(id => id !== value)
    );
  };

  // Generate content with OpenAI
  const handleGenerateContent = async () => {
    if (!departureCityId || !destinationCityId) {
       setSubmitStatus({ success: false, message: 'Please select departure and destination cities first.' });
       return;
    }

    setIsGenerating(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/admin/routes/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCityId,
          destinationCityId,
          additionalInstructions: additionalInstructions.trim(),
          isAirportPickup: routeType === 'airportPickup',
          isAirportDropoff: routeType === 'airportDropoff',
          isCityToCity: routeType === 'cityToCity',
          isPrivateDriver: routeType === 'privateDriver',
          isSightseeingShuttle: routeType === 'sightseeingShuttle',
          viatorDestinationLink: viatorDestinationLink.trim() || null // ✅ Pass link to API
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const data = await response.json();
      console.log("Received data from generate-content:", data); // DEBUG LOG 1
      setMetaTitle(data.metaTitle || '');
      setMetaDescription(data.metaDescription || '');
      setMetaKeywords(data.metaKeywords || '');
      setSeoDescription(data.seoDescription || '');
      setTravelTime(data.travelTime || '');
      setOtherStops(Array.isArray(data.otherStops) ? data.otherStops.join(', ') : (data.otherStops || ''));
      // Update selected amenities based on the response
      const newAmenityIds = data.matchedAmenityIds || []; // DEBUG LOG 2 - Capture IDs
      console.log("Updating selectedAmenityIds with:", newAmenityIds); // DEBUG LOG 3 - Log IDs being set
      setSelectedAmenityIds(newAmenityIds);
      // Removed misleading log here (DEBUG LOG 4)

      setSubmitStatus({
        success: true,
        message: 'Content generated successfully! Review amenities below.' // Updated message
      });
    } catch (error) {
      let detailedErrorMessage = 'Failed to generate content. Please try again.';
      if (error instanceof Error) {
        detailedErrorMessage = error.message;
      }
      console.error('Error generating content:', detailedErrorMessage, error);
      setSubmitStatus({
        success: false,
        message: detailedErrorMessage
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Waypoint Handlers ---
  const handleWaypointChange = useCallback((index: number, field: 'name' | 'lat' | 'lng', value: string) => {
    const updated = [...mapWaypoints];
    if (updated[index]) {
      let newValue: string | number = value;
      if (field === 'lat' || field === 'lng') {
        const parsed = parseFloat(value);
        newValue = isNaN(parsed) ? value : parsed;
      }

      updated[index] = {
        ...updated[index],
        [field]: newValue
      };
      setMapWaypoints(updated);
    }
  }, [mapWaypoints]);

  const handleAddWaypoint = useCallback(() => {
    setMapWaypoints([...mapWaypoints, { name: '', lat: 0, lng: 0 }]);
  }, [mapWaypoints]);

  const handleRemoveWaypoint = useCallback((index: number) => {
    const updated = mapWaypoints.filter((_, i) => i !== index);
    setMapWaypoints(updated);
  }, [mapWaypoints]);
  // --- End Waypoint Handlers ---

  // --- Nearby Stops Handlers ---
  const handleNearbyStopChange = useCallback((index: number, field: 'name' | 'lat' | 'lng', value: string) => {
    const updated = [...possibleNearbyStops];
    if (updated[index]) {
      let newValue: string | number = value;
      if (field === 'lat' || field === 'lng') {
        const parsed = parseFloat(value);
        newValue = isNaN(parsed) ? value : parsed;
      }

      updated[index] = {
        ...updated[index],
        [field]: newValue
      };
      setPossibleNearbyStops(updated);
    }
  }, [possibleNearbyStops]);

  const handleAddNearbyStop = useCallback(() => {
    setPossibleNearbyStops([...possibleNearbyStops, { name: '', lat: 0, lng: 0 }]);
  }, [possibleNearbyStops]);

  const handleRemoveNearbyStop = useCallback((index: number) => {
    const updated = possibleNearbyStops.filter((_, i) => i !== index);
    setPossibleNearbyStops(updated);
  }, [possibleNearbyStops]);
  // --- End Nearby Stops Handlers ---

  // --- DND Kit Sensors and Drag End Handler ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPossibleNearbyStops((items) => {
        const oldIndex = items.findIndex((item, index) => (item.id ?? `nearby-${index}`) === active.id);
        const newIndex = items.findIndex((item, index) => (item.id ?? `nearby-${index}`) === over.id);
        // Ensure IDs are unique for arrayMove
        const itemsWithUniqueIds = items.map((item, index) => ({ ...item, uniqueId: item.id ?? `nearby-${index}` }));
        const movedItems = arrayMove(itemsWithUniqueIds, oldIndex, newIndex);
        // Remove temporary uniqueId before setting state
        return movedItems.map(({ uniqueId, ...rest }) => rest);
      });
    }
  }, []);
  // --- End DND Kit ---


  if (isLoadingPageData) { // Use combined loading state
    return <div className="text-center p-4">Loading route data...</div>;
  }

  if (pageLoadError) { // Use combined error state
    return (
      <div>
        <Link href="/management-portal-8f7d3e2a1c/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
          &larr; Back to Routes
        </Link>
        <p className="text-center p-4 text-red-600">{pageLoadError}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link href="/management-portal-8f7d3e2a1c/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Routes
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Route</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Departure City Selection */}
          <div>
            <label htmlFor="departure-city" className="block text-sm font-medium text-gray-700 mb-1">
              Departure City *
            </label>
            {/* Use combined loading state for simplicity, or keep individual if preferred */}
            {isLoadingPageData ? (
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50">Loading...</div>
            ) : (
              <select
                id="departure-city"
                value={departureCityId}
                onChange={(e) => setDepartureCityId(e.target.value)}
                required
                size={10} // Add size attribute
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Select departure city</option>
                {availableCities.map((city) => (
                  <option key={`dep-${city.id}`} value={city.id}>
                    {city.name}, {city.country.name}
                  </option>
                ))}
              </select>
            )}
            {/* Consider showing cityLoadError specifically if needed */}
            {/* {cityLoadError && <p className="text-xs text-red-600 mt-1">{cityLoadError}</p>} */}
          </div>

          {/* Destination City Selection */}
          <div>
            <label htmlFor="destination-city" className="block text-sm font-medium text-gray-700 mb-1">
              Destination City *
            </label>
            {isLoadingPageData ? (
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50">Loading...</div>
            ) : (
              <select
                id="destination-city"
                value={destinationCityId}
                onChange={(e) => setDestinationCityId(e.target.value)}
                required
                size={10} // Add size attribute
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Select destination city</option>
                {availableCities.map((city) => (
                  <option key={`dest-${city.id}`} value={city.id}>
                    {city.name}, {city.country.name}
                  </option>
                ))}
              </select>
            )}
             {/* Consider showing cityLoadError specifically if needed */}
            {/* {cityLoadError && <p className="text-xs text-red-600 mt-1">{cityLoadError}</p>} */}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name *
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Shuttles from Liberia to Tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">This will be displayed as the title on the route page</p>
        </div>

        {/* URL Slug */}
        <div>
          <label htmlFor="route-slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug *
          </label>
          <input
            id="route-slug"
            type="text"
            value={routeSlug}
            onChange={(e) => setRouteSlug(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., liberia-to-tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">Format: departure-to-destination</p>
        </div>

        {/* Viator Widget Code */}
        <div>
          <label htmlFor="viator-code" className="block text-sm font-medium text-gray-700 mb-1">
            Viator Widget Code *
          </label>
          <textarea
            id="viator-code"
            value={viatorWidgetCode}
            onChange={(e) => setViatorWidgetCode(e.target.value)}
            required
            rows={6}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm text-gray-900"
            placeholder="Paste the full HTML/script code from Viator here..."
          />
        </div>

        {/* Route Type Flags */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Route Type (Select one):</label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                id="isAirportPickup"
                name="routeType"
                type="radio"
                value="airportPickup"
                checked={routeType === 'airportPickup'}
                onChange={(e) => setRouteType(e.target.value as RouteType)}
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="isAirportPickup" className="ml-2 block text-sm text-gray-900">
                Airport Pickup
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="isAirportDropoff"
                name="routeType"
                type="radio"
                value="airportDropoff"
                checked={routeType === 'airportDropoff'}
                onChange={(e) => setRouteType(e.target.value as RouteType)}
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="isAirportDropoff" className="ml-2 block text-sm text-gray-900">
                Airport Dropoff
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="isCityToCity"
                name="routeType"
                type="radio"
                value="cityToCity"
                checked={routeType === 'cityToCity'}
                onChange={(e) => setRouteType(e.target.value as RouteType)}
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="isCityToCity" className="ml-2 block text-sm text-gray-900">
              City-to-City
            </label>
          </div>
           <div className="flex items-center">
            <input
              id="isPrivateDriver"
              name="routeType"
              type="radio"
              value="privateDriver"
              checked={routeType === 'privateDriver'}
              onChange={(e) => setRouteType(e.target.value as RouteType)}
              className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="isPrivateDriver" className="ml-2 block text-sm text-gray-900">
              Private Driving Service
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="isSightseeingShuttle"
              name="routeType"
              type="radio"
              value="sightseeingShuttle"
              checked={routeType === 'sightseeingShuttle'}
              onChange={(e) => setRouteType(e.target.value as RouteType)}
              className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="isSightseeingShuttle" className="ml-2 block text-sm text-gray-900">
              Sightseeing Shuttle
            </label>
          </div>
        </div>
        </div>

        {/* Video Generator */}
        <VideoGenerator routeId={routeId} videoUrl={originalData?.videoUrl} />

        {/* Travel Time */}
        <div>
          <label htmlFor="travel-time" className="block text-sm font-medium text-gray-700 mb-1">
            Travel Time (Optional)
          </label>
          <input
            id="travel-time"
            type="text"
            value={travelTime}
            onChange={(e) => setTravelTime(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Approx. 2-3 hours"
          />
           <p className="text-xs text-gray-500 mt-1">AI generated, can be edited.</p>
        </div>

        {/* Other Stops */}
        <div>
          <label htmlFor="other-stops" className="block text-sm font-medium text-gray-700 mb-1">
            Other Stops (Optional)
          </label>
          <input
            id="other-stops"
            type="text"
            value={otherStops}
            onChange={(e) => setOtherStops(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Orotina, Herradura"
          />
           <p className="text-xs text-gray-500 mt-1">AI generated, can be edited.</p>
        </div>

        {/* Meta Title */}
        <div>
          <label htmlFor="meta-title" className="block text-sm font-medium text-gray-700 mb-1">
            Meta Title (60-70 characters)
          </label>
          <input
            id="meta-title"
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
          <p className="text-sm text-gray-500 mt-1">{metaTitle.length} characters</p>
        </div>

        {/* Meta Description */}
        <div>
          <label htmlFor="meta-description" className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description (150-160 characters)
          </label>
          <textarea
            id="meta-description"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
          <p className="text-sm text-gray-500 mt-1">{metaDescription.length} characters</p>
        </div>

        {/* Meta Keywords */}
        <div>
          <label htmlFor="meta-keywords" className="block text-sm font-medium text-gray-700 mb-1">
            Meta Keywords (comma-separated)
          </label>
          <input
            id="meta-keywords"
            type="text"
            value={metaKeywords}
            onChange={(e) => setMetaKeywords(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="keyword1, keyword2, keyword3..."
          />
        </div>

        {/* Additional Instructions */}
        <div>
          <label htmlFor="additional-instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Instructions for Content Generation
          </label>
          <textarea
            id="additional-instructions"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="Enter information about the route service, amenities, cities, hotels, etc..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Include details about the service, featured cities, hotels, or special amenities.
            This content will be cleaned and formatted before sending to AI.
          </p>
        </div>

        {/* Destination Tours Link */}
        <div>
          <label htmlFor="viator-destination-link" className="block text-sm font-medium text-gray-700 mb-1">
            Destination Tours Link (Optional)
          </label>
          <input
            id="viator-destination-link"
            type="url"
            value={viatorDestinationLink}
            onChange={(e) => setViatorDestinationLink(e.target.value)}
            placeholder="https://www.viator.com/en-CA/s/La-Fortuna/d5092"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">Link to the Viator (or other) tours page for the destination city.</p>
        </div>

        {/* Content Editor Controls */}
        <ContentEditorControls
          additionalInstructions={additionalInstructions}
          setAdditionalInstructions={setAdditionalInstructions}
          seoDescription={seoDescription}
          setSeoDescription={setSeoDescription}
          isGenerating={isGenerating}
        />

        {/* SEO Description with Generate Button */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700">
              SEO Description
            </label>
            <button
              type="button"
              onClick={handleGenerateContent}
              disabled={isGenerating}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate with ChatGPT'}
            </button>
          </div>
          <textarea
            id="seo-description"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={8}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="Enter a detailed description for search engines..."
          />
        </div>

        {/* Amenities Section */}
        <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Amenities</h3>
        {isLoadingPageData && <p className="text-sm text-gray-500">Loading amenities...</p>}
        {pageLoadError && <p className="text-sm text-red-500">Could not load amenities.</p>}
        {!isLoadingPageData && !pageLoadError && allAmenities.length === 0 && <p className="text-sm text-gray-500">No amenities found.</p>}
        {/* --- Debug Log for Rendering Conditions (wrapped) --- */}
        {(() => { console.log("[DEBUG EditRoutePage] Rendering Amenities Checkboxes - Conditions:", { isLoading: isLoadingPageData, error: pageLoadError, count: allAmenities.length }); return null; })()}
        {/* --- End Debug Log --- */}
        {!isLoadingPageData && !pageLoadError && allAmenities.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allAmenities.map((amenity) => (
              <div key={amenity.id} className="flex items-center">
                <input
                    id={`amenity-${amenity.id}`}
                    type="checkbox"
                    value={amenity.id}
                    checked={selectedAmenityIds.includes(amenity.id)}
                    onChange={handleAmenityChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor={`amenity-${amenity.id}`} className="ml-2 block text-sm text-gray-900">
                    {amenity.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* End Amenities Section */}

        {/* --- Waypoints Section --- */}
        {(routeType === 'privateDriver' || routeType === 'sightseeingShuttle') && (
          <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Waypoints / Stops</h3>
            {mapWaypoints && mapWaypoints.length > 0 ? (
              <div className="space-y-4">
                {mapWaypoints.map((wp, index) => (
                  <div key={index} className="p-3 border border-gray-300 rounded bg-white shadow-sm space-y-2 relative group">
                     <div className="flex justify-between items-start">
                       <span className="text-xs font-medium text-gray-500">Stop {index + 1}</span>
                       <button
                         type="button" // Important: prevent form submission
                         onClick={() => handleRemoveWaypoint(index)}
                         className="absolute top-1 right-1 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100"
                         aria-label={`Remove waypoint ${index + 1}`}
                       >
                         &#x2715; {/* Cross symbol */}
                      </button>
                    </div>
                    {/* Waypoint Name Input */}
                    <input
                      type="text"
                      value={wp.name || ''}
                      onChange={(e) => handleWaypointChange(index, 'name', e.target.value)}
                      placeholder="Waypoint name (e.g., La Fortuna Waterfall)"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 mb-1"
                    />
                    {/* Lat/Lng Inputs */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any" // Allow decimals
                        value={wp.lat ?? ''} // Handle potential undefined/null
                        onChange={(e) => handleWaypointChange(index, 'lat', e.target.value)}
                        placeholder="Latitude"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        step="any" // Allow decimals
                        value={wp.lng ?? ''} // Handle potential undefined/null
                        onChange={(e) => handleWaypointChange(index, 'lng', e.target.value)}
                        placeholder="Longitude"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No waypoints defined. Add stops relevant to this route.</p>
            )}

            <button
              type="button" // Important: prevent form submission
              onClick={handleAddWaypoint}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium py-1 px-3 border border-blue-300 rounded hover:bg-blue-50"
            >
              + Add Waypoint
            </button>
             <p className="text-xs text-gray-500 mt-2">Waypoints are shown on the route page for Private Driving and Sightseeing Shuttle types.</p>
          </div>
        )}
        {/* --- End Waypoints Section --- */}

        {/* --- Possible Nearby Stops Section (with DND) --- */}
        {(routeType === 'airportPickup' || routeType === 'airportDropoff' || routeType === 'cityToCity') && (
          <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Possible Nearby Stops (Drag to Reorder)</h3>
            <p className="text-sm text-amber-600 mb-3">
              These are tourist attractions or points of interest near the route that travelers might want to visit.
              The stops will be displayed with the disclaimer that they are not guaranteed and travelers need to
              ask the shuttle provider if stopping is possible.
            </p>

            {possibleNearbyStops && possibleNearbyStops.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                {/* Ensure items have unique IDs for SortableContext */}
                <SortableContext
                  items={possibleNearbyStops.map((stop, index) => stop.id ?? `nearby-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {possibleNearbyStops.map((stop, index) => (
                      <SortableNearbyStopItem
                        key={stop.id ?? `nearby-${index}`}
                        id={stop.id ?? `nearby-${index}`}
                        stop={stop}
                        index={index}
                        handleNearbyStopChange={handleNearbyStopChange}
                        handleRemoveNearbyStop={handleRemoveNearbyStop}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No nearby stops defined. Add attractions or points of interest near this route.</p>
            )}

            <button
              type="button"
              onClick={handleAddNearbyStop}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium py-1 px-3 border border-green-300 rounded hover:bg-green-50"
            >
              + Add Nearby Stop
            </button>
            <p className="text-xs text-gray-500 mt-2">Nearby stops will appear on the route page with a disclaimer that they require approval from shuttle providers.</p>
          </div>
        )}
        {/* --- End Possible Nearby Stops Section --- */}

      {/* Submit Button & Status Message */}
      <div className="pt-2">
        {submitStatus && (
          <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
            {submitStatus.message}
          </p>
        )}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Route'}
          </button>
          {originalData?.routeSlug && (
            <Link
              href={`/routes/${originalData.routeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              View Route
            </Link>
          )}
          <Link href="/management-portal-8f7d3e2a1c/routes" className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
            Cancel
          </Link>
        </div>
        </div>
      </form>
    </div>
  );
};

// --- Sortable Item Component for Nearby Stops ---
interface SortableNearbyStopItemProps {
  id: string;
  stop: NearbyStop;
  index: number;
  handleNearbyStopChange: (index: number, field: 'name' | 'lat' | 'lng', value: string) => void;
  handleRemoveNearbyStop: (index: number) => void;
}

function SortableNearbyStopItem({
  id,
  stop,
  index,
  handleNearbyStopChange,
  handleRemoveNearbyStop
}: SortableNearbyStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Added to style while dragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, // Make item semi-transparent while dragging
    zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is on top
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 border border-gray-300 rounded bg-white shadow-sm space-y-2 relative group flex items-start" // Use flex for alignment
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 mr-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none" // Added touch-none
        aria-label="Drag to reorder stop"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Stop Content */}
      <div className="flex-grow space-y-2">
        <div className="flex justify-between items-start">
          {/* Display the number */}
          <span className="text-sm font-medium text-gray-700">Stop {index + 1}</span>
          <button
            type="button"
            onClick={() => handleRemoveNearbyStop(index)}
            className="absolute top-1 right-1 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100"
            aria-label={`Remove nearby stop ${index + 1}`}
          >
            &#x2715; {/* Cross symbol */}
          </button>
        </div>
        {/* Nearby Stop Name Input */}
        <input
          type="text"
          value={stop.name || ''}
          onChange={(e) => handleNearbyStopChange(index, 'name', e.target.value)}
          placeholder="Stop name (e.g., Rainbow Waterfall)"
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 mb-1"
        />
        {/* Lat/Lng Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            value={stop.lat ?? ''}
            onChange={(e) => handleNearbyStopChange(index, 'lat', e.target.value)}
            placeholder="Latitude"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="number"
            step="any"
            value={stop.lng ?? ''}
            onChange={(e) => handleNearbyStopChange(index, 'lng', e.target.value)}
            placeholder="Longitude"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
// --- End Sortable Item Component ---

export default EditRoutePage;
