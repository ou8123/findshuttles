"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ContentEditorControls from './ContentEditorControls';
import { WaypointStop } from '@/lib/aiWaypoints'; // Import WaypointStop type

// Define the expected structure of the location data from the API (for lookup)
interface CityLookup {
  id: string;
  name: string;
  slug: string;
  countryName: string; // Changed from nested country object to flat countryName
}

interface CountryWithCitiesLookup {
  id: string;
  name: string;
  slug: string;
  cities: CityLookup[];
}

// Define libraries for Google Maps API
const libraries: ("places")[] = ['places'];

// Define type for route type state
type RouteType = 'airportPickup' | 'airportDropoff' | 'cityToCity' | 'privateDriver' | 'sightseeingShuttle';

const AddRouteForm = () => {
  // State for internal locations lookup data
  const [locationsLookup, setLocationsLookup] = useState<CountryWithCitiesLookup[]>([]);
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(true);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for Autocomplete instances and selected place names/matched cities
  const [departureAutocomplete, setDepartureAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destinationAutocomplete, setDestinationAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [departureName, setDepartureName] = useState<string>('');
  const [destinationName, setDestinationName] = useState<string>('');
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<CityLookup | null>(null);
  const [selectedDestinationCity, setSelectedDestinationCity] = useState<CityLookup | null>(null);

  // State for form fields
  const [viatorWidgetCode, setViatorWidgetCode] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [metaTitle, setMetaTitle] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [metaKeywords, setMetaKeywords] = useState<string>('');
  const [seoDescription, setSeoDescription] = useState<string>('');
  const [routeType, setRouteType] = useState<RouteType>('cityToCity'); // State for route type flags, default to cityToCity
  const [mapWaypoints, setMapWaypoints] = useState<WaypointStop[]>([]); // State for waypoints

  // State for ChatGPT generation
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // State for submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isCreatingLocation, setIsCreatingLocation] = useState<boolean>(false);
  const [createLocationError, setCreateLocationError] = useState<string | null>(null);

  // Refs for inputs
  const departureInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // --- Load Google Maps API ---
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
  });

  // Fetch internal locations data on mount
  useEffect(() => {
    const fetchLocationsLookup = async () => {
      setIsLoadingLocationsLookup(true);
      setLocationLookupError(null);
      try {
        const response = await fetch('/api/locations');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CountryWithCitiesLookup[] = await response.json();
        setLocationsLookup(data);
      } catch (err: unknown) {
        console.error("Failed to fetch internal locations lookup:", err);
        let message = "Could not load location data.";
        if (err instanceof Error) {
            message = err.message;
        }
        setLocationLookupError(message);
      } finally {
        setIsLoadingLocationsLookup(false);
      }
    };
    fetchLocationsLookup();
  }, []);

  // --- Autocomplete Helper ---
  const findMatchingCity = (placeName: string): CityLookup | null => {
    const normalizedPlaceName = placeName
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!normalizedPlaceName) return null; 

    for (const country of locationsLookup) {
      const cityMatch = country.cities.find(city => city.name.trim().toLowerCase() === normalizedPlaceName);
      if (cityMatch) {
        return cityMatch;
      }
    }
    return null;
  };

  // --- Helper to call the find-or-create API ---
  const handleFindOrCreateLocation = async (
    place: google.maps.places.PlaceResult,
    setter: (city: CityLookup | null) => void
  ): Promise<CityLookup | null> => {
    console.log("Full place object:", place);
    console.log("Address components:", place.address_components);
    console.log("Geometry:", place.geometry);

    if (!place.address_components) {
      setCreateLocationError('Selected place is missing required details (address components).');
      return null;
    }

    let cityName = '';
    let countryName = '';
    
    place.address_components.forEach(component => {
      console.log("Component:", {
        long_name: component.long_name,
        short_name: component.short_name,
        types: component.types
      });
    });

    if (place.name && place.name.length > 1) {
        cityName = place.name;
        console.log("Using place.name as initial cityName:", cityName);
    }

    const countryComponent = place.address_components.find(c => c.types.includes('country'));
    if (countryComponent) {
        countryName = countryComponent.long_name;
    }

    const localityComponent = place.address_components.find(c => c.types.includes('locality'));
    if (localityComponent) {
        if (!cityName || (cityName !== localityComponent.long_name && localityComponent.long_name.length > 1)) {
             console.log("Overwriting/Setting cityName with locality:", localityComponent.long_name);
             cityName = localityComponent.long_name;
        }
    }
    else if (!cityName) { 
        const adminArea1Component = place.address_components.find(c => c.types.includes('administrative_area_level_1'));
        if (adminArea1Component) {
            console.log("Using administrative_area_level_1 as cityName:", adminArea1Component.long_name);
            cityName = adminArea1Component.long_name;
        }
    }

    const latitude = place.geometry?.location?.lat();
    const longitude = place.geometry?.location?.lng();

    console.log("Extracted data:", {
      cityName,
      countryName,
      latitude,
      longitude
    });

    if (!cityName || !countryName) {
      setCreateLocationError(`Could not extract city or country name for "${place.name}".`);
      console.error("Missing city/country components:", place.address_components);
      return null;
    }

    setIsCreatingLocation(true);
    setCreateLocationError(null);
    setSubmitStatus(null);

    const payload = {
      cityName,
      countryName,
      latitude: latitude ?? null,
      longitude: longitude ?? null
    };

    console.log("Sending payload to API:", payload);

    try {
      const response = await fetch('/api/admin/locations/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        throw new Error(result.error || `Failed to find or create location (HTTP ${response.status})`);
      }

      const createdCity: CityLookup = result;
      setter(createdCity);
      console.log(`Successfully found/created and set city: ${createdCity.name}`);
      return createdCity;

    } catch (error: unknown) {
      console.error("Error in handleFindOrCreateLocation:", error);
      let message = "Failed to add the selected location to the database.";
      if (error instanceof Error) {
        message = error.message;
      }
      setCreateLocationError(message);
      setter(null);
      return null;
    } finally {
      setIsCreatingLocation(false);
    }
  };

  // --- Autocomplete Handlers ---
  const onDepartureLoad = (autocomplete: google.maps.places.Autocomplete) => {
    console.log("Departure autocomplete loaded");
    setDepartureAutocomplete(autocomplete);
  };

  const onDestinationLoad = (autocomplete: google.maps.places.Autocomplete) => {
    console.log("Destination autocomplete loaded");
    setDestinationAutocomplete(autocomplete);
  };

  const onDeparturePlaceChanged = async () => {
    setSelectedDepartureCity(null);
    setCreateLocationError(null);
    if (departureAutocomplete !== null) {
      const place = departureAutocomplete.getPlace();
      console.log("Departure place selected:", place);
      if (place?.name) {
        const selectedName = place.name;
        setDepartureName(selectedName);
        const matchedCity = findMatchingCity(selectedName);
        if (matchedCity) {
          setSelectedDepartureCity(matchedCity);
          console.log("Matched Departure City:", matchedCity);
        } else {
          console.warn(`Selected departure "${selectedName}" not found in internal data. Attempting to find or create...`);
          await handleFindOrCreateLocation(place, setSelectedDepartureCity);
        }
      } else {
        setDepartureName('');
      }
    }
  };

  const onDestinationPlaceChanged = async () => {
    setSelectedDestinationCity(null);
    setCreateLocationError(null);
    if (destinationAutocomplete !== null) {
      const place = destinationAutocomplete.getPlace();
      console.log("Destination place selected:", place);
      if (place?.name) {
        const selectedName = place.name;
        setDestinationName(selectedName);
        const matchedCity = findMatchingCity(selectedName);
        if (matchedCity) {
          setSelectedDestinationCity(matchedCity);
          console.log("Matched Destination City:", matchedCity);
        } else {
          console.warn(`Selected destination "${selectedName}" not found in internal data. Attempting to find or create...`);
          console.log(`Calling handleFindOrCreateLocation for destination: ${selectedName}`);
          await handleFindOrCreateLocation(place, setSelectedDestinationCity);
        }
      } else {
        setDestinationName('');
      }
    }
  };

  // Handle manual input clearing
  const handleDepartureInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === '') {
      setDepartureName('');
      setSelectedDepartureCity(null);
    }
  };

  const handleDestinationInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === '') {
      setDestinationName('');
      setSelectedDestinationCity(null);
    }
  };

  // For router navigation (disabled in our case to prevent redirects)
  const router = useRouter();

  // State to track the created route
  const [createdRoute, setCreatedRoute] = useState<{ id: string; routeSlug: string } | null>(null);

  // Handle form submission without clearing the form (Save functionality)
  const handleSave = async (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent form submission
    await submitRouteData(false);
  };
  
  // Handle full form submission (Add Route functionality)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission behavior that would cause a page refresh
    await submitRouteData(true);
    
    return false; // Extra safety to prevent form submission
  };

  // Combined function to submit route data
  const submitRouteData = async (clearForm: boolean) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    console.log('submitRouteData called. States:', {
      selectedDepartureCity: selectedDepartureCity,
      selectedDestinationCity: selectedDestinationCity,
      routeType: routeType, 
      mapWaypoints: mapWaypoints, 
    });

    if (!selectedDepartureCity || !selectedDestinationCity) {
      setSubmitStatus({ success: false, message: 'Please select valid departure and destination cities from the suggestions that match cities in our system.' });
      setIsSubmitting(false);
      return;
    }
    if (selectedDepartureCity.id === selectedDestinationCity.id && routeType !== 'privateDriver' && routeType !== 'sightseeingShuttle') {
      setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same for this route type.' });
      setIsSubmitting(false);
      return;
    }
    if (!viatorWidgetCode) {
      setSubmitStatus({ success: false, message: 'Viator Widget Code is required.' });
      setIsSubmitting(false);
      return;
    }

    if (mapWaypoints.length > 0) {
        const invalidWaypoint = mapWaypoints.some(wp => typeof wp.lat !== 'number' || typeof wp.lng !== 'number');
        if (invalidWaypoint) {
            setSubmitStatus({ success: false, message: 'One or more waypoints have invalid latitude or longitude values.' });
            setIsSubmitting(false);
            return;
        }
    }

    try {
      const response = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCityId: selectedDepartureCity.id,
          destinationCityId: selectedDestinationCity.id,
          viatorWidgetCode,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          metaKeywords: metaKeywords || undefined,
          seoDescription: seoDescription || undefined,
          isAirportPickup: routeType === 'airportPickup',
          isAirportDropoff: routeType === 'airportDropoff',
          isCityToCity: routeType === 'cityToCity',
          isPrivateDriver: routeType === 'privateDriver', 
          isSightseeingShuttle: routeType === 'sightseeingShuttle', 
          mapWaypoints: mapWaypoints.length > 0 ? mapWaypoints : null, 
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      console.log("Route created successfully:", result);
      
      setCreatedRoute({
        id: result.id,
        routeSlug: result.routeSlug
      });

      setSubmitStatus({ 
        success: true, 
        message: `Route ${clearForm ? 'created' : 'saved'} successfully! Slug: ${result.routeSlug}` 
      });
      
      if (clearForm) {
        setDepartureName('');
        setDestinationName('');
        setSelectedDepartureCity(null);
        setSelectedDestinationCity(null);
        setViatorWidgetCode('');
        setMetaTitle('');
        setMetaDescription('');
        setMetaKeywords('');
        setSeoDescription('');
        setRouteType('cityToCity'); 
        setMapWaypoints([]); // Clear waypoints
        if (departureInputRef.current) departureInputRef.current.value = '';
        if (destinationInputRef.current) destinationInputRef.current.value = '';
      }

    } catch (error: unknown) {
      console.error("Failed to submit new route:", error);
      let message = "Failed to create route. Please try again.";
      if (error instanceof Error) {
        message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Waypoint Handlers (Copied from Edit Form) ---
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

  // --- Render Logic ---
  if (loadError) {
    console.error("Google Maps API load error:", loadError);
    return <div className="text-center p-4 text-red-600">Error loading Google Maps services.</div>;
  }

  if (!isLoaded) {
    return <div className="text-center p-4">Loading Map Services...</div>;
  }

  if (!apiKey) {
    return <div className="text-center p-4 text-red-600">Configuration error: Google Maps API Key is missing.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Departure City Autocomplete */}
      <div>
        <label htmlFor="admin-departure" className="block text-sm font-medium text-gray-700 mb-1">
          Departure City *
        </label>
        <Autocomplete
          onLoad={onDepartureLoad}
          onPlaceChanged={onDeparturePlaceChanged}
          options={{ types: ['(cities)'] }}
        >
          <input
            id="admin-departure"
            type="text"
            ref={departureInputRef}
            required={!selectedDepartureCity}
            placeholder="Enter departure city"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            onChange={handleDepartureInputChange}
          />
        </Autocomplete>
        {departureName && !selectedDepartureCity && <p className="text-xs text-orange-600 mt-1">Warning: Selected city "{departureName}" not found in our system.</p>}
      </div>

      {/* Destination City Autocomplete */}
      <div>
        <label htmlFor="admin-destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destination City *
        </label>
        <Autocomplete
          onLoad={onDestinationLoad}
          onPlaceChanged={onDestinationPlaceChanged}
          options={{ types: ['(cities)'] }}
        >
          <input
            id="admin-destination"
            type="text"
            ref={destinationInputRef}
            required={!selectedDestinationCity}
            placeholder="Enter destination city"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            onChange={handleDestinationInputChange}
          />
        </Autocomplete>
        {destinationName && !selectedDestinationCity && <p className="text-xs text-orange-600 mt-1">Warning: Selected city "{destinationName}" not found in our system.</p>}
      </div>

      {isLoadingLocationsLookup && <p className="text-sm text-gray-500 mt-1">Loading existing location data...</p>}
      {locationLookupError && <p className="text-sm text-red-500 mt-1">{locationLookupError}</p>}
      {isCreatingLocation && <p className="text-sm text-blue-600 mt-1">Adding selected location to database...</p>}
      {createLocationError && <p className="text-sm text-red-600 mt-1">{createLocationError}</p>}

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
            onClick={async () => {
              if (!selectedDepartureCity || !selectedDestinationCity) {
                setSubmitStatus({
                  success: false,
                  message: 'Please select both departure and destination cities first.'
                });
                return;
              }

              if (!viatorWidgetCode) {
                setSubmitStatus({
                  success: false,
                  message: 'Please enter the Viator Widget Code first.'
                });
                return;
              }

              setIsGenerating(true);
              try {
                const response = await fetch('/api/admin/routes/generate-content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    departureCityId: selectedDepartureCity.id,
                    destinationCityId: selectedDestinationCity.id,
                    additionalInstructions: additionalInstructions.trim(),
                    isAirportPickup: routeType === 'airportPickup',
                    isAirportDropoff: routeType === 'airportDropoff',
                    isCityToCity: routeType === 'cityToCity',
                    isPrivateDriver: routeType === 'privateDriver', 
                    isSightseeingShuttle: routeType === 'sightseeingShuttle', 
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to generate content');
                }

                const data = await response.json();
                setMetaTitle(data.metaTitle || '');
                setMetaDescription(data.metaDescription || '');
                setMetaKeywords(data.metaKeywords || '');
                setSeoDescription(data.seoDescription || '');
                setSubmitStatus({
                  success: true,
                  message: 'Content generated successfully!'
                });
              } catch (error) {
                console.error('Error generating content:', error);
                setSubmitStatus({
                  success: false,
                  message: error instanceof Error ? error.message : 'Failed to generate content. Please try again.'
                });
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating || !selectedDepartureCity || !selectedDestinationCity}
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

      {/* --- Waypoints Section (Moved to bottom) --- */}
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

      {/* Action Buttons & Status Message */}
      <div className="pt-2">
        {submitStatus && (
          <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
            {submitStatus.message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || isLoadingLocationsLookup || !isLoaded}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding Route...' : 'Add Route'}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || isLoadingLocationsLookup || !isLoaded || 
                     !selectedDepartureCity || !selectedDestinationCity || !viatorWidgetCode}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          
          {/* View button is always visible but disabled when no route has been created */}
          {createdRoute ? (
            <Link 
              href={`/routes/${createdRoute.routeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-center"
            >
              View Route
            </Link>
          ) : (
            <button
              type="button"
              disabled={true}
              className="flex-1 bg-purple-300 text-white py-2 px-4 rounded-md cursor-not-allowed"
              title="Create a route first to enable viewing"
            >
              View Route
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export default AddRouteForm;
