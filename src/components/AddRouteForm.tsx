"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

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
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [metaTitle, setMetaTitle] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [metaKeywords, setMetaKeywords] = useState<string>('');
  const [seoDescription, setSeoDescription] = useState<string>('');

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
    setter: (city: CityLookup | null) => void
  ): Promise<CityLookup | null> => {
    console.log("Full place object:", place);
    console.log("Address components:", place.address_components);
    console.log("Geometry:", place.geometry);

    if (!place.address_components) {
      setCreateLocationError('Selected place is missing required details (address components).');
      return null;
    }

    // Extract city and country from address components
    let cityName = '';
    let countryName = '';
    
    // Log each component for debugging
    place.address_components.forEach(component => {
      console.log("Component:", {
        long_name: component.long_name,
        short_name: component.short_name,
        types: component.types
      });
    });

    // Try multiple component types for city name
    for (const component of place.address_components) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
      } else if (!cityName && component.types.includes('administrative_area_level_1')) {
        // Use administrative_area_level_1 as fallback for city name
        cityName = component.long_name;
      }
      
      if (component.types.includes('country')) {
        countryName = component.long_name;
      }
    }

    // If still no city name, try using the place name
    if (!cityName && place.name) {
      console.log("Using place name as city name:", place.name);
      cityName = place.name;
    }

    // Extract coordinates if available
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

    // Prepare payload including coordinates
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
          departureCityId: selectedDepartureCity.id,
          destinationCityId: selectedDestinationCity.id,
          viatorWidgetCode,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          metaKeywords: metaKeywords || undefined,
          seoDescription: seoDescription || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      // Success
      setSubmitStatus({ success: true, message: `Route created successfully! Slug: ${result.routeSlug}` });
      // Clear form
      setDepartureName('');
      setDestinationName('');
      setSelectedDepartureCity(null);
      setSelectedDestinationCity(null);
      setViatorWidgetCode('');
      setMetaTitle('');
      setMetaDescription('');
      setMetaKeywords('');
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

      {/* Additional Information */}
      <div>
        <label htmlFor="additional-info" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Information (Optional)
        </label>
        <textarea
          id="additional-info"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          placeholder="Enter any additional information to include in the first paragraph of the description..."
        />
        <p className="text-xs text-gray-500 mt-1">If provided, this text will be used verbatim as the first paragraph of the SEO description.</p>
      </div>

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
                    departureCityName: selectedDepartureCity.name,
                    destinationCityName: selectedDestinationCity.name,
                    destinationCountryName: selectedDestinationCity.countryName,
                    viatorWidgetCode,
                    additionalInfo: additionalInfo.trim()
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
