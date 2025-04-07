"use client";

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ContentEditorControls from '@/components/ContentEditorControls';
import { WaypointStop } from '@/lib/aiWaypoints'; // Import the waypoint type

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
    // Note: hotelsServed is a relation, not fetched directly here usually
    departureCity: { name: string; id: string };
    destinationCity: { name: string; id: string };
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
  // Removed suggestedHotelsList state
  // const [suggestedHotelsList, setSuggestedHotelsList] = useState<string[]>([]); 
  const [routeType, setRouteType] = useState<RouteType>('cityToCity'); // State for route type flags
  // Note: We don't need separate state for each boolean flag, 
  // the single 'routeType' state handles which one is active.
  const [originalData, setOriginalData] = useState<RouteData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedAmenityIds, setSuggestedAmenityIds] = useState<string[]>([]); // State for suggested amenities
  const [allAmenities, setAllAmenities] = useState<{id: string, name: string}[]>([]); // State to hold all amenities for display lookup
  const [mapWaypoints, setMapWaypoints] = useState<WaypointStop[]>([]); // State for waypoints

  // State for city selection
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);

  // Loading/Submitting/Error state
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch all available amenities (for displaying suggestions)
  useEffect(() => {
    const fetchAllAmenities = async () => {
      try {
        // Assuming an API endpoint exists to fetch all amenities
        // TODO: Create /api/admin/amenities if it doesn't exist
        const response = await fetch('/api/admin/amenities'); 
        if (!response.ok) throw new Error('Failed to fetch amenities');
        const data = await response.json();
        setAllAmenities(data.amenities || []); // Assuming response is { amenities: [...] }
      } catch (err) {
        console.error("Failed to fetch all amenities:", err);
        // Handle error appropriately, maybe show a message
      }
    };
    fetchAllAmenities();
  }, []); // Runs once on component mount

  // Fetch all available cities
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityLoadError(null);
      try {
        const response = await fetch('/api/admin/cities'); 
        if (!response.ok) throw new Error(`Failed to fetch cities: ${response.status}`);
        const data = await response.json();
        const cities = data.cities || []; 
        console.log("Fetched cities:", cities.length);
        setAvailableCities(cities);
      } catch (err) {
        console.error("Failed to fetch cities:", err);
        setCityLoadError("Could not load city data. You can still edit other fields.");
      } finally {
        setIsLoadingCities(false);
      }
    };
    
    fetchCities();
  }, []);

  // Fetch the specific route data
  useEffect(() => {
    if (!routeId) {
        setError("Route ID not found in URL.");
        setIsLoadingRoute(false);
        return;
    }

    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      setError(null);
      try {
        console.log(`Attempting to fetch route with ID: ${routeId}`);
        const response = await fetch(`/api/admin/routes/${routeId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
          throw new Error(errorData.error || `Failed to fetch route: ${response.status}`);
        }
        
        const routeData: RouteData = await response.json();
        console.log("Successfully fetched route directly:", routeData);

        if (!routeData || typeof routeData !== 'object' || !routeData.id) {
          throw new Error('Invalid route data received from API.');
        }
        
        // Store original data
        setOriginalData(routeData);
        
        // Populate form state including new fields
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
        // Initialize mapWaypoints state - ensure it's an array
        setMapWaypoints(Array.isArray(routeData.mapWaypoints) ? routeData.mapWaypoints : []);

        // Set initial routeType based on fetched flags
        if (routeData.isAirportPickup) {
          setRouteType('airportPickup');
        } else if (routeData.isAirportDropoff) {
          setRouteType('airportDropoff');
        } else if (routeData.isPrivateDriver) { // Check new flag
          setRouteType('privateDriver');
        } else if (routeData.isSightseeingShuttle) { // Check new flag
          setRouteType('sightseeingShuttle');
        } else { 
          // Default to cityToCity if none of the specific flags are true
          setRouteType('cityToCity'); 
        }
      } catch (err: unknown) {
        console.error("Failed to fetch route data:", err);
        let message = "Could not load route data. Please try again or contact support.";
        if (err instanceof Error) {
            message = err.message;
        }
        setError(message);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [routeId]);

  // Helper to determine original route type for comparison
  const getOriginalRouteType = (): RouteType | null => { // Can return null if no data
    if (!originalData) return null; 
    if (originalData.isAirportPickup) return 'airportPickup';
    if (originalData.isAirportDropoff) return 'airportDropoff';
    if (originalData.isPrivateDriver) return 'privateDriver'; // Check new flag
    if (originalData.isSightseeingShuttle) return 'sightseeingShuttle'; // Check new flag
    if (originalData.isCityToCity) return 'cityToCity'; 
    return 'cityToCity'; // Default if somehow none are true (shouldn't happen with API logic)
  };

  // Mark handleSubmit as async
  const handleSubmit = async (event: React.FormEvent) => { 
    event.preventDefault();

    if (!departureCityId || !destinationCityId || !viatorWidgetCode || !routeSlug || !displayName) {
      setSubmitStatus({ success: false, message: 'All required fields must be filled out.' });
      return;
    }
    // Corrected Frontend Validation: Allow same departure/destination only for specific types
    if (departureCityId === destinationCityId && routeType !== 'privateDriver' && routeType !== 'sightseeingShuttle') {
      setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same for this route type.' });
      return;
    }

    // Prepare potentially null values - MOVED INSIDE handleSubmit
    const currentMetaTitle = metaTitle.trim() === '' ? null : metaTitle.trim();
    const currentMetaDesc = metaDescription.trim() === '' ? null : metaDescription.trim();
    const currentMetaKeywords = metaKeywords.trim() === '' ? null : metaKeywords.trim();
    const currentSeoDesc = seoDescription.trim() === '' ? null : seoDescription.trim();
    const currentTravelTime = travelTime.trim() === '' ? null : travelTime.trim(); 
    const currentOtherStops = otherStops.trim() === '' ? null : otherStops.trim(); 
    const currentIsAirportPickup = routeType === 'airportPickup';
    const currentIsAirportDropoff = routeType === 'airportDropoff';
    const currentIsCityToCity = routeType === 'cityToCity';
    const currentIsPrivateDriver = routeType === 'privateDriver'; 
    const currentIsSightseeingShuttle = routeType === 'sightseeingShuttle'; 

    if (!originalData) {
      setSubmitStatus({ success: false, message: 'Original route data not found.' });
      return;
    }

    // Check if any data actually changed
    const originalRouteType = getOriginalRouteType();
    const originalWaypointsForCompare = Array.isArray(originalData.mapWaypoints) ? originalData.mapWaypoints : [];
    const currentWaypointsForCompare = mapWaypoints; 

    // Determine if only the waypoints were cleared (or are empty now when they weren't originally)
    const waypointsCleared = (originalWaypointsForCompare.length > 0 && currentWaypointsForCompare.length === 0);
    
    // Check if other fields changed OR if waypoints were specifically cleared
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
        routeType === originalRouteType
    );

    // Compare waypoint arrays using stringify ONLY if other fields haven't changed
    const waypointsChanged = otherFieldsChanged ? true : (JSON.stringify(currentWaypointsForCompare) !== JSON.stringify(originalWaypointsForCompare));

    if (!otherFieldsChanged && !waypointsChanged) {
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }
    
    // If we reach here, either other fields changed, or the waypoints array content changed.
    // The backend PUT handler will now correctly regenerate if waypoints are empty.

    setIsSubmitting(true); // Set submitting state *before* the try block
    setSubmitStatus(null); // Clear previous status

    try {
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
            // Send updated flags based on routeType state
            isAirportPickup: currentIsAirportPickup,
            isAirportDropoff: currentIsAirportDropoff,
            isCityToCity: currentIsCityToCity,
            isPrivateDriver: currentIsPrivateDriver, // Send new flag state
            isSightseeingShuttle: currentIsSightseeingShuttle, // Send new flag state
            mapWaypoints: mapWaypoints.length > 0 ? mapWaypoints : null, // Send current waypoints or null if empty
         }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      setSubmitStatus({ success: true, message: `Route updated successfully!` });
      
      // Update original data to reflect changes
      setOriginalData({
        ...originalData,
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
        isPrivateDriver: currentIsPrivateDriver, // Update original data state
        isSightseeingShuttle: currentIsSightseeingShuttle, // Update original data state
        mapWaypoints: mapWaypoints.length > 0 ? mapWaypoints : null, // Update original data state
      });
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
   }; // <--- Correct closing brace for handleSubmit

  // Generate content with OpenAI
  const handleGenerateContent = async () => {
    // Use current form state for departure/destination IDs
    if (!departureCityId || !destinationCityId) {
       setSubmitStatus({ success: false, message: 'Please select departure and destination cities first.' });
       return;
    }
    
    setIsGenerating(true);
    setSubmitStatus(null);
    // Removed clearing suggestedHotelsList
    // setSuggestedHotelsList([]); 
    
    try {
      const response = await fetch('/api/admin/routes/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCityId,
          destinationCityId,
          additionalInstructions: additionalInstructions.trim(),
          // Pass the current route type flags to the API
                    isAirportPickup: routeType === 'airportPickup',
                    isAirportDropoff: routeType === 'airportDropoff',
                    isCityToCity: routeType === 'cityToCity',
                    isPrivateDriver: routeType === 'privateDriver', // Pass new flag
                    isSightseeingShuttle: routeType === 'sightseeingShuttle', // Pass new flag
                  }),
                });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const data = await response.json();

      // --- BEGIN Log successful response data ---
      console.log("Content Generation API Response:", data);
      // --- END Log successful response data ---

      // Update all relevant fields from AI response
      setMetaTitle(data.metaTitle || '');
      setMetaDescription(data.metaDescription || '');
      setMetaKeywords(data.metaKeywords || '');
      setSeoDescription(data.seoDescription || '');
      setTravelTime(data.travelTime || ''); // Update travel time from AI
      setOtherStops(data.otherStops || ''); // Update other stops from AI
      // Removed setting suggestedHotelsList
      // setSuggestedHotelsList(data.suggestedHotels || []);
      setSuggestedAmenityIds(data.matchedAmenityIds || []); // Store suggested amenity IDs

      setSubmitStatus({
        success: true,
        message: 'Content generated successfully! Review and save changes.' 
      });
    } catch (error) {
      // --- BEGIN Enhanced Error Logging ---
      let detailedErrorMessage = 'Failed to generate content. Please try again.';
      if (error instanceof Error) {
        detailedErrorMessage = error.message; // Use the error message from the caught error
      }
      console.error('Error generating content:', detailedErrorMessage, error); // Log the detailed message and the original error object
      // --- END Enhanced Error Logging ---
      setSubmitStatus({
        success: false,
        // Use the detailed error message for the user status
        message: detailedErrorMessage
        // Removed duplicate message line that caused the syntax error
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Waypoint Handlers ---
  const handleWaypointChange = useCallback((index: number, field: 'name', value: string) => {
    // Only allow changing the name for now via this simple form
    // Lat/Lng changes would ideally need a map interface
    const updated = [...mapWaypoints];
    if (updated[index]) {
      // Create a new object with updated name, preserving lat/lng
      updated[index] = {
        ...updated[index], // Spread existing properties (lat, lng)
        name: value        // Update the name
      };
      setMapWaypoints(updated);
    }
  }, [mapWaypoints]); // Dependency array includes mapWaypoints

  const handleAddWaypoint = useCallback(() => {
    // Add a new waypoint object with default lat/lng (e.g., 0 or fetch current location?)
    // Using 0,0 as placeholder - admin should ideally verify/update these if needed elsewhere or via map tool
    setMapWaypoints([...mapWaypoints, { name: '', lat: 0, lng: 0 }]);
  }, [mapWaypoints]); // Dependency array includes mapWaypoints

  const handleRemoveWaypoint = useCallback((index: number) => {
    // Filter out the waypoint at the specified index
    const updated = mapWaypoints.filter((_, i) => i !== index);
    setMapWaypoints(updated);
  }, [mapWaypoints]); // Dependency array includes mapWaypoints
  // --- End Waypoint Handlers ---


  if (isLoadingRoute) {
    return <div className="text-center p-4">Loading route data...</div>;
  }
  
  if (error) {
    return (
      <div>
        <Link href="/management-portal-8f7d3e2a1c/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
          &larr; Back to Routes
        </Link>
        <p className="text-center p-4 text-red-600">{error}</p>
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
            {isLoadingCities ? (
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50">Loading cities...</div>
            ) : (
              <select
                id="departure-city"
                value={departureCityId}
                onChange={(e) => setDepartureCityId(e.target.value)}
                required
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
            {cityLoadError && <p className="text-xs text-red-600 mt-1">{cityLoadError}</p>}
          </div>
          
          {/* Destination City Selection */}
          <div>
            <label htmlFor="destination-city" className="block text-sm font-medium text-gray-700 mb-1">
              Destination City *
            </label>
            {isLoadingCities ? (
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50">Loading cities...</div>
            ) : (
              <select
                id="destination-city"
                value={destinationCityId}
                onChange={(e) => setDestinationCityId(e.target.value)}
                required
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
            {cityLoadError && <p className="text-xs text-red-600 mt-1">{cityLoadError}</p>}
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
                name="routeType" // Use radio buttons for mutual exclusivity
                type="radio"
                value="airportPickup" // Assign value
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
                value="airportDropoff" // Assign value
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
                value="cityToCity" // Assign value
                checked={routeType === 'cityToCity'}
                onChange={(e) => setRouteType(e.target.value as RouteType)}
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="isCityToCity" className="ml-2 block text-sm text-gray-900">
              City-to-City
            </label>
          </div>
           {/* New Radio Buttons */}
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
                    <input
                      type="text"
                      value={wp.name || ''} // Ensure value is controlled
                      onChange={(e) => handleWaypointChange(index, 'name', e.target.value)}
                      placeholder="Waypoint name (e.g., La Fortuna Waterfall)"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {/* Display Lat/Lng (read-only in this basic form) */}
                    <div className="text-xs text-gray-500">
                      Lat: {wp.lat?.toFixed(6) ?? 'N/A'}, Lng: {wp.lng?.toFixed(6) ?? 'N/A'}
                    </div>
                    {/* Removed description textarea */}
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

        {/* Display Suggested Amenities */}
        {suggestedAmenityIds.length > 0 && (
          <div className="mt-4 p-3 border border-green-200 bg-green-50 rounded-md">
            <h3 className="text-sm font-medium text-green-800 mb-2">Suggested Highlights (based on generated description):</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedAmenityIds.map(id => {
                const amenity = allAmenities.find(a => a.id === id);
                return amenity ? (
                  <span key={id} className="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {amenity.name}
                  </span>
                ) : null;
              })}
            </div>
            <p className="text-xs text-green-700 mt-2">These will be saved when you click "Update Route".</p>
          </div>
        )}

        {/* Removed Suggested Hotels Display */}
        {/* {suggestedHotelsList.length > 0 && ( ... )} */}

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

export default EditRoutePage;
