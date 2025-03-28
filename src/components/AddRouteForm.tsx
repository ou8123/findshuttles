"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

// Define the expected structure of the location data from the API (for lookup)
interface CityLookup {
  id: string;
  name: string;
  slug: string;
}
interface CountryWithCitiesLookup {
  id: string;
  name: string;
  slug: string;
  cities: CityLookup[];
}

// Define libraries for Google Maps API
const libraries: ("places")[] = ['places'];

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
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<CityLookup | null>(null); // Matched city from our DB
  const [selectedDestinationCity, setSelectedDestinationCity] = useState<CityLookup | null>(null); // Matched city from our DB

  // State for other form fields
  const [viatorWidgetCode, setViatorWidgetCode] = useState<string>('');
  const [seoDescription, setSeoDescription] = useState<string>('');

  // State for submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isCreatingLocation, setIsCreatingLocation] = useState<boolean>(false); // State for find-or-create loading
  const [createLocationError, setCreateLocationError] = useState<string | null>(null); // State for find-or-create error

  // Refs for inputs
  const departureInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // --- Load Google Maps API ---
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
  });
  // --- End Load Google Maps API ---

  // Fetch internal locations data on mount (for ID/slug lookup)
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
        setLocationLookupError(message); // Use specific error message here
      } finally {
        setIsLoadingLocationsLookup(false);
      }
    };
    fetchLocationsLookup();
  }, []);

  // --- Autocomplete Helper ---
  const findMatchingCity = (placeName: string): CityLookup | null => {
      const nameLower = placeName.trim().toLowerCase();
      for (const country of locationsLookup) {
          const cityMatch = country.cities.find(city => city.name.trim().toLowerCase() === nameLower);
          if (cityMatch) {
              return cityMatch;
          }
      }
      return null;
  };

  // --- Helper to call the find-or-create API ---
  const handleFindOrCreateLocation = async (
    place: google.maps.places.PlaceResult,
    setter: React.Dispatch<React.SetStateAction<CityLookup | null>>
  ): Promise<CityLookup | null> => {
    if (!place.address_components || !place.name) {
      setCreateLocationError("Selected place is missing required details (address components or name).");
      return null;
    }

    // Extract city and country names from address_components
    const cityComponent = place.address_components.find(comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_3'));
    const countryComponent = place.address_components.find(comp => comp.types.includes('country'));

    const cityName = cityComponent?.long_name || place.name; // Fallback to place name if locality not found
    const countryName = countryComponent?.long_name;

    // Extract coordinates if available
    const latitude = place.geometry?.location?.lat();
    const longitude = place.geometry?.location?.lng();

    if (!cityName || !countryName) {
      setCreateLocationError(`Could not extract city or country name for "${place.name}".`);
      console.error("Missing city/country components:", place.address_components);
      return null;
    }

    setIsCreatingLocation(true);
    setCreateLocationError(null);
    setSubmitStatus(null); // Clear previous submit status

    // Prepare payload including coordinates
    const payload = {
        cityName,
        countryName,
        latitude: latitude ?? null, // Send null if undefined
        longitude: longitude ?? null // Send null if undefined
    };

    try {
      const response = await fetch('/api/admin/locations/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // Send payload with coords
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to find or create location (HTTP ${response.status})`);
      }

      const createdCity: CityLookup = result; // API returns CityLookup shape
      setter(createdCity); // Update the state (departure or destination)
      console.log(`Successfully found/created and set city: ${createdCity.name}`);
      // Optionally refresh the locations lookup, though not strictly necessary here
      // fetchLocationsLookup();
      return createdCity;

    } catch (error: unknown) {
      console.error("Error in handleFindOrCreateLocation:", error);
      let message = "Failed to add the selected location to the database.";
      if (error instanceof Error) {
        message = error.message;
      }
      setCreateLocationError(message);
      setter(null); // Ensure selection is cleared on error
      return null;
    } finally {
      setIsCreatingLocation(false);
    }
  };


  // --- Autocomplete Handlers ---
  const onDepartureLoad = (autocomplete: google.maps.places.Autocomplete) => setDepartureAutocomplete(autocomplete);
  const onDestinationLoad = (autocomplete: google.maps.places.Autocomplete) => setDestinationAutocomplete(autocomplete);

  const onDeparturePlaceChanged = async () => {
    setSelectedDepartureCity(null); // Reset match
    setCreateLocationError(null); // Clear previous errors
    if (departureAutocomplete !== null) {
      const place = departureAutocomplete.getPlace();
      if (place?.name) {
        const selectedName = place.name;
        setDepartureName(selectedName);
        const matchedCity = findMatchingCity(selectedName);
        if (matchedCity) {
            setSelectedDepartureCity(matchedCity);
            console.log("Matched Departure City:", matchedCity);
        } else {
            console.warn(`Selected departure "${selectedName}" not found in internal data. Attempting to find or create...`);
            // Call the helper to find or create
            await handleFindOrCreateLocation(place, setSelectedDepartureCity);
        }
      } else {
        setDepartureName(''); // Clear name if selection invalid
      }
    }
  };

   const onDestinationPlaceChanged = async () => {
    setSelectedDestinationCity(null); // Reset match
    setCreateLocationError(null); // Clear previous errors
    if (destinationAutocomplete !== null) {
      const place = destinationAutocomplete.getPlace();
       if (place?.name) {
        const selectedName = place.name;
        setDestinationName(selectedName);
         const matchedCity = findMatchingCity(selectedName);
        if (matchedCity) {
            setSelectedDestinationCity(matchedCity);
            console.log("Matched Destination City:", matchedCity);
        } else {
            console.warn(`Selected destination "${selectedName}" not found in internal data. Attempting to find or create...`);
            // Call the helper to find or create
            await handleFindOrCreateLocation(place, setSelectedDestinationCity);
        }
      } else {
         setDestinationName(''); // Clear name if selection invalid
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
  // --- End Autocomplete Handlers ---


  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Validate that cities were selected AND matched in our DB
    if (!selectedDepartureCity || !selectedDestinationCity) {
        setSubmitStatus({ success: false, message: 'Please select valid departure and destination cities from the suggestions that match cities in our system.' });
        setIsSubmitting(false);
        return;
    }
     if (selectedDepartureCity.id === selectedDestinationCity.id) {
        setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same.' });
        setIsSubmitting(false);
        return;
    }
     if (!viatorWidgetCode) {
        setSubmitStatus({ success: false, message: 'Viator Widget Code is required.' });
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCityId: selectedDepartureCity.id, // Use ID from matched city
          destinationCityId: selectedDestinationCity.id, // Use ID from matched city
          viatorWidgetCode,
          seoDescription: seoDescription || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      // Success
      setSubmitStatus({ success: true, message: `Route created successfully! Slug: ${result.routeSlug}` });
      // Clear form (including autocomplete inputs)
      setDepartureName('');
      setDestinationName('');
      setSelectedDepartureCity(null);
      setSelectedDestinationCity(null);
      setViatorWidgetCode('');
      setSeoDescription('');
      if (departureInputRef.current) departureInputRef.current.value = '';
      if (destinationInputRef.current) destinationInputRef.current.value = '';

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
    // No <LoadScript> needed
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
              required={!selectedDepartureCity} // Require input if no valid city selected
              placeholder="Enter departure city"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              onChange={handleDepartureInputChange}
            />
       </Autocomplete>
       {departureName && !selectedDepartureCity && <p className="text-xs text-orange-600 mt-1">Warning: Selected city &quot;{departureName}&quot; not found in our system.</p>}
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
         {destinationName && !selectedDestinationCity && <p className="text-xs text-orange-600 mt-1">Warning: Selected city &quot;{destinationName}&quot; not found in our system.</p>}
     </div>

      {/* Loading/Error state for internal location data */}
       {isLoadingLocationsLookup && <p className="text-sm text-gray-500 mt-1">Loading existing location data...</p>}
       {locationLookupError && <p className="text-sm text-red-500 mt-1">{locationLookupError}</p>}

       {/* Loading/Error state for find-or-create process */}
       {isCreatingLocation && <p className="text-sm text-blue-600 mt-1">Checking/adding selected location to database...</p>}
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
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm text-gray-900" // Added text color
          placeholder="Paste the full HTML/script code from Viator here..."
        />
      </div>

       {/* SEO Description */}
       <div>
        <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700 mb-1">
          SEO Description (Optional)
        </label>
        <textarea
          id="seo-description"
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" // Added text color
          placeholder="Enter a brief description for search engines..."
        />
      </div>

      {/* Submit Button & Status Message */}
      <div className="pt-2">
         {submitStatus && (
            <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                {submitStatus.message}
            </p>
         )}
        <button
          type="submit"
          disabled={isSubmitting || isLoadingLocationsLookup || !isLoaded}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding Route...' : 'Add Route'}
        </button>
      </div>
    </form>
  );
};

export default AddRouteForm;