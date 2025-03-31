"use client";

import { useState, useEffect, useRef } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface City {
    id: string;
    name: string;
    country: { 
        name: string;
        slug: string;
    };
    slug: string;
}

// Define the expected structure of the location data from the API (for lookup)
interface CityLookup {
  id: string;
  name: string;
  slug: string;
  countryName: string; // Flat countryName for lookups
}

interface CountryWithCitiesLookup {
  id: string;
  name: string;
  slug: string;
  cities: CityLookup[];
}

// Define libraries for Google Maps API
const libraries: ("places")[] = ['places'];

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
    departureCity: { name: string };
    destinationCity: { name: string };
}

const EditRoutePage = () => {
  const router = useRouter();
  const params = useParams();
  const routeId = params?.routeId as string;

  // Google Maps API setup
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: libraries,
  });

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
  const [isCreatingLocation, setIsCreatingLocation] = useState<boolean>(false);
  const [createLocationError, setCreateLocationError] = useState<string | null>(null);
  
  // Refs for inputs
  const departureInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

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
  const [originalData, setOriginalData] = useState<RouteData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisplayNameCustomized, setIsDisplayNameCustomized] = useState(false);
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);

  // City list state
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [cityError, setCityError] = useState<string | null>(null);

  // Loading/Submitting/Error state
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch internal locations lookup data for Google Places matching
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

  // Fetch cities for dropdowns (legacy)
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityError(null);
      try {
        const response = await fetch('/api/admin/cities');
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data: City[] = await response.json();
        setCities(data);
      } catch (err: unknown) {
        console.error("Failed to fetch cities for dropdown:", err);
        let message = "Could not load cities.";
        if (err instanceof Error) {
            message = err.message;
        }
        setCityError(message);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
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
      
      // Also update the corresponding ID field for form submission
      if (setter === setSelectedDepartureCity) {
        setDepartureCityId(createdCity.id);
      } else if (setter === setSelectedDestinationCity) {
        setDestinationCityId(createdCity.id);
      }
      
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
          setDepartureCityId(matchedCity.id);
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
          setDestinationCityId(matchedCity.id);
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

  // Update route slug when cities change
  useEffect(() => {
    if (!departureCityId || !destinationCityId || !cities.length) return;

    const departureCity = cities.find(c => c.id === departureCityId);
    const destinationCity = cities.find(c => c.id === destinationCityId);
    
    if (departureCity && destinationCity) {
      // Generate the default slug for these cities (without special handling for US)
      const defaultSlug = `${departureCity.slug}-to-${destinationCity.slug}`;
      
      // Only update slug if not manually customized by user
      if (!isSlugCustomized) {
        setRouteSlug(defaultSlug);
      }

      // Only update display name if not customized and cities changed
      if (!isDisplayNameCustomized) {
        let defaultDisplayName = '';
        
        // Check if both cities are in the same country
        if (departureCity.country.name === destinationCity.country.name) {
          // Same country format: "Shuttles from City1 to City2, Country"
          defaultDisplayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}, ${departureCity.country.name}`;
        } else {
          // Different countries format: "Shuttles from City1, Country1 to City2, Country2"
          defaultDisplayName = `Shuttles from ${departureCity.name}, ${departureCity.country.name} to ${destinationCity.name}, ${destinationCity.country.name}`;
        }
        
        setDisplayName(defaultDisplayName);
      }
    }
  }, [departureCityId, destinationCityId, cities, isSlugCustomized, isDisplayNameCustomized]);

  // Set initial autocomplete input values when cities are loaded
  useEffect(() => {
    if (cities.length && departureCityId && destinationCityId) {
      const departureCity = cities.find(c => c.id === departureCityId);
      const destinationCity = cities.find(c => c.id === destinationCityId);
      
      if (departureCity && departureInputRef.current) {
        departureInputRef.current.value = `${departureCity.name}, ${departureCity.country.name}`;
        // Create a CityLookup object from the City object
        setSelectedDepartureCity({
          id: departureCity.id,
          name: departureCity.name,
          slug: departureCity.slug,
          countryName: departureCity.country.name
        });
      }
      
      if (destinationCity && destinationInputRef.current) {
        destinationInputRef.current.value = `${destinationCity.name}, ${destinationCity.country.name}`;
        // Create a CityLookup object from the City object  
        setSelectedDestinationCity({
          id: destinationCity.id,
          name: destinationCity.name,
          slug: destinationCity.slug,
          countryName: destinationCity.country.name
        });
      }
    }
  }, [cities, departureCityId, destinationCityId]);

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
        // First try to fetch the specific route directly
        let routeData: RouteData | null = null;
        try {
          const specificResponse = await fetch(`/api/admin/routes/${routeId}`);
          if (specificResponse.ok) {
            const specificData = await specificResponse.json();
            // Verify the data has the expected shape
            if (specificData && typeof specificData === 'object' && 'id' in specificData) {
              routeData = specificData as RouteData;
            }
          }
        } catch (specificErr) {
          console.warn("Could not fetch specific route, falling back to list:", specificErr);
        }
        
        // If specific route fetch failed, try fetching from the routes list
        if (!routeData) {
          const response = await fetch(`/api/admin/routes`);
          if (!response.ok) throw new Error('Failed to fetch routes list');
          const data = await response.json();
          
          // Make sure routes is an array before calling find()
          const routes = Array.isArray(data.routes) 
            ? data.routes 
            : Array.isArray(data) 
              ? data 
              : [];
              
          const foundRoute = routes.find((r: any) => r.id === routeId);
          
          // Verify the found route has the expected shape
          if (foundRoute && typeof foundRoute === 'object' && 'id' in foundRoute) {
            routeData = foundRoute as RouteData;
          }
        }

        if (!routeData) throw new Error('Route not found');

        // Store original data
        setOriginalData(routeData);

        // Use a type-safe way to populate form state
        const safeRouteData: RouteData = routeData;
        
        // Populate form state
        setDepartureCityId(safeRouteData.departureCityId);
        setDestinationCityId(safeRouteData.destinationCityId);
        setRouteSlug(safeRouteData.routeSlug);
        setDisplayName(safeRouteData.displayName);
        setViatorWidgetCode(safeRouteData.viatorWidgetCode);
        setMetaTitle(safeRouteData.metaTitle ?? '');
        setMetaDescription(safeRouteData.metaDescription ?? '');
        setMetaKeywords(safeRouteData.metaKeywords ?? '');
        setSeoDescription(safeRouteData.seoDescription ?? '');

        // Check if display name is customized
        const defaultDisplayName = `Shuttles from ${routeData.departureCity.name} to ${routeData.destinationCity.name}`;
        setIsDisplayNameCustomized(routeData.displayName !== defaultDisplayName);

      } catch (err: unknown) {
        console.error("Failed to fetch route data:", err);
        let message = "Could not load route data.";
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

  const handleSubmit = async (event: React.FormEvent, shouldRedirect: boolean = false) => {
    event.preventDefault();

    if (!departureCityId || !destinationCityId || !viatorWidgetCode || !routeSlug || !displayName) {
      setSubmitStatus({ success: false, message: 'All required fields must be filled out.' });
      return;
    }
    if (departureCityId === destinationCityId) {
      setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same.' });
      return;
    }

    const currentMetaTitle = metaTitle.trim() === '' ? null : metaTitle.trim();
    const currentMetaDesc = metaDescription.trim() === '' ? null : metaDescription.trim();
    const currentMetaKeywords = metaKeywords.trim() === '' ? null : metaKeywords.trim();
    const currentSeoDesc = seoDescription.trim() === '' ? null : seoDescription.trim();

    if (!originalData) {
      setSubmitStatus({ success: false, message: 'Original route data not found.' });
      return;
    }

    if (departureCityId === originalData.departureCityId &&
        destinationCityId === originalData.destinationCityId &&
        routeSlug === originalData.routeSlug &&
        displayName === originalData.displayName &&
        viatorWidgetCode === originalData.viatorWidgetCode &&
        currentMetaTitle === originalData.metaTitle &&
        currentMetaDesc === originalData.metaDescription &&
        currentMetaKeywords === originalData.metaKeywords &&
        currentSeoDesc === originalData.seoDescription) {
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

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
            seoDescription: currentSeoDesc
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
        seoDescription: currentSeoDesc
      });

      // Only redirect if specified - Use stealth URL path
      if (shouldRedirect) {
        router.push('/management-portal-8f7d3e2a1c/routes');
      }

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

  if (isLoadingRoute || isLoadingCities || isLoadingLocationsLookup) {
    return <div className="text-center p-4">Loading data...</div>;
  }
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
  if (cityError) {
    return <p className="text-center p-4 text-red-600">{cityError}</p>;
  }

  return (
    <div>
      <Link href="/management-portal-8f7d3e2a1c/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Routes
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Route</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white p-6 rounded-lg shadow-md">
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
          {selectedDepartureCity && <p className="text-xs text-green-600 mt-1">Selected: {selectedDepartureCity.name}, {selectedDepartureCity.countryName} (ID: {selectedDepartureCity.id})</p>}
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
          {selectedDestinationCity && <p className="text-xs text-green-600 mt-1">Selected: {selectedDestinationCity.name}, {selectedDestinationCity.countryName} (ID: {selectedDestinationCity.id})</p>}
        </div>

        {/* Status messages for location finding/creation */}
        {isCreatingLocation && <p className="text-sm text-blue-600 mt-1">Adding selected location to database...</p>}
        {createLocationError && <p className="text-sm text-red-600 mt-1">{createLocationError}</p>}
        {locationLookupError && <p className="text-sm text-red-500 mt-1">{locationLookupError}</p>}

        {/* Display Name */}
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name *
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setIsDisplayNameCustomized(true);
            }}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Shuttles from Liberia to Tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">This will be displayed as the title on the route page</p>
        </div>

        {/* URL Slug */}
        <div>
          <label htmlFor="route-slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug * <span className="font-normal text-blue-600">(Customizable)</span>
          </label>
          <input
            id="route-slug"
            type="text"
            value={routeSlug}
            onChange={(e) => {
              setRouteSlug(e.target.value);
              setIsSlugCustomized(true);
            }}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., liberia-to-tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: departure-to-destination<br />
            <span className="text-blue-600">
              This custom slug will be used throughout the site, including search results and URLs.
            </span>
          </p>
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
            placeholder="Add any specific details, attractions, or requirements you want to include in the generated content..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
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
                if (!departureCityId || !destinationCityId) {
                  setSubmitStatus({
                    success: false,
                    message: 'Please select both departure and destination cities first.'
                  });
                  return;
                }

                setIsGenerating(true);
                try {
                  const response = await fetch('/api/admin/routes/generate-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      departureCityId, 
                      destinationCityId,
                      additionalInstructions,
                      viatorHtml: viatorWidgetCode
                    }),
                  });

                  if (!response.ok) throw new Error('Failed to generate content');

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
                    message: 'Failed to generate content. Please try again.'
                  });
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating || !departureCityId || !destinationCityId}
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
          />
        </div>

        {/* Submit Buttons & Status */}
        <div className="pt-2">
          {submitStatus && (
            <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
              {submitStatus.message}
            </p>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            {/* Save button - stays on page */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={isSubmitting}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            
            {/* Save and Close button - redirects back */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isSubmitting}
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save & Close'}
            </button>
            
            {/* View button - opens route in new tab using public URL */}
            <a
              href={originalData ? `/routes/${routeSlug}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex justify-center items-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${!originalData || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                if (!originalData || isSubmitting) {
                  e.preventDefault();
                }
              }}
            >
              View Public
            </a>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditRoutePage;
