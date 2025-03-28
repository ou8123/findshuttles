"use client"; // This component needs client-side interactivity

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'; // Import useJsApiLoader

// Define the expected structure of the location data from the API
interface DestinationCity {
  id: string;
  name: string;
  slug: string;
  country?: {
      id: string;
      name: string;
  }
}
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

const SearchForm = () => {
  const router = useRouter();

  // State for our internal locations data (used for slug lookup)
  const [locationsLookup, setLocationsLookup] = useState<CountryWithCitiesLookup[]>([]);
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(true);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for Departure Autocomplete
  const [departureAutocomplete, setDepartureAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [departureName, setDepartureName] = useState<string>('');
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<CityLookup | null>(null);

  // State for Destination Dropdown
  const [validDestinations, setValidDestinations] = useState<DestinationCity[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [selectedDestinationCityId, setSelectedDestinationCityId] = useState<string>('');

  const departureInputRef = useRef<HTMLInputElement>(null);

  // --- Load Google Maps API ---
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "", // Ensure apiKey is not undefined
    libraries: libraries,
    // preventLoading: !apiKey, // Prevent loading if key is missing (optional)
  });
  // --- End Load Google Maps API ---


  // Fetch our internal locations data on mount
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
        let message = "Could not load location data for routing.";
        if (err instanceof Error) {
            message = err.message;
        }
        // Optionally, keep the generic message or use the specific one
        setLocationLookupError("Could not load location data for routing."); // Keeping generic for user display
      } finally {
        setIsLoadingLocationsLookup(false);
      }
    };
    fetchLocationsLookup();
  }, []);

  // Fetch valid destinations when a valid departure city is selected
  useEffect(() => {
    const fetchValidDestinations = async (departureId: string) => {
      setIsLoadingDestinations(true);
      setDestinationError(null);
      setValidDestinations([]);
      setSelectedDestinationCityId('');
      try {
        const response = await fetch(`/api/valid-destinations?departureCityId=${departureId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: DestinationCity[] = await response.json();
        setValidDestinations(data);
        if (data.length === 0) {
            setDestinationError("No routes found from this departure city.");
        }
      } catch (err: unknown) {
        console.error("Failed to fetch valid destinations:", err);
        let message = "Could not load destinations.";
        if (err instanceof Error) {
            message = err.message;
        }
        // Use the specific error message for more detail, or keep generic
        setDestinationError(message);
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    if (selectedDepartureCity?.id) {
      fetchValidDestinations(selectedDepartureCity.id);
    } else {
      setValidDestinations([]);
      setSelectedDestinationCityId('');
      setDestinationError(null);
    }
  }, [selectedDepartureCity]);


  // --- Autocomplete Handlers ---
  const onDepartureLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setDepartureAutocomplete(autocomplete);
  };

  const onDeparturePlaceChanged = () => {
    setSelectedDepartureCity(null);
    if (departureAutocomplete !== null) {
      const place = departureAutocomplete.getPlace();
      if (place?.name) {
        const selectedName = place.name;
        setDepartureName(selectedName);
        console.log("Departure Place Selected:", selectedName);

        const nameLower = selectedName.trim().toLowerCase();
        let foundCity: CityLookup | null = null;
        for (const country of locationsLookup) {
            const cityMatch = country.cities.find(city => city.name.trim().toLowerCase() === nameLower);
            if (cityMatch) {
                foundCity = cityMatch;
                break;
            }
        }

        if (foundCity) {
            console.log("Matched internal departure city:", foundCity);
            setSelectedDepartureCity(foundCity);
        } else {
            console.warn(`Selected departure place "${selectedName}" not found in internal locations data.`);
            setValidDestinations([]);
            setSelectedDestinationCityId('');
            setDestinationError("Selected departure city not found in our system.");
        }

      } else {
        console.log('Departure Autocomplete: No details available for input');
        setDepartureName('');
        setSelectedDepartureCity(null);
      }
    } else {
      console.log('Departure Autocomplete is not loaded yet!');
    }
  };
  // --- End Autocomplete Handlers ---

  const handleDepartureInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (value === '') {
          setDepartureName('');
          setSelectedDepartureCity(null);
      }
  };


  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDepartureCity || !selectedDestinationCityId) {
      alert("Please select a valid departure city and a destination from the list.");
      return;
    }

    const destinationCity = validDestinations.find(city => city.id === selectedDestinationCityId);

    if (selectedDepartureCity.slug && destinationCity?.slug) {
      const routeSlug = `${selectedDepartureCity.slug}-to-${destinationCity.slug}`;
      console.log(`Navigating to route: /routes/${routeSlug}`);
      router.push(`/routes/${routeSlug}`);
    } else {
      alert("Could not construct route information. Please re-select departure and destination.");
      console.error("Slug missing for departure or destination", selectedDepartureCity, destinationCity);
    }
  };

  // --- Render Logic ---
  if (loadError) {
      console.error("Google Maps API load error:", loadError);
      return <div className="text-center p-4 text-red-600">Error loading Google Maps services. Please check the API key and configuration.</div>;
  }

  if (!isLoaded) {
      return <div className="text-center p-4">Loading Map Services...</div>;
  }

  // Check API key presence after checking loadError/isLoaded
  if (!apiKey) {
      console.error("Google Maps API Key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.");
      return <div className="text-center p-4 text-red-600">Configuration error: Google Maps API Key is missing.</div>;
  }

  return (
      // No <LoadScript> wrapper needed here
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Find Your Shuttle</h2>

        {/* Departure Autocomplete */}
        <div>
          <label htmlFor="departure" className="block text-sm font-medium text-gray-700 mb-1">
            From:
          </label>
          <Autocomplete
            onLoad={onDepartureLoad}
            onPlaceChanged={onDeparturePlaceChanged}
            options={{ types: ['(cities)'] }}
          >
            <input
              id="departure"
              type="text"
              ref={departureInputRef}
              required
              placeholder="Enter departure city"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              onChange={handleDepartureInputChange}
            />
          </Autocomplete>
           {isLoadingLocationsLookup && <p className="text-xs text-gray-500 mt-1">Loading location data...</p>}
           {locationLookupError && <p className="text-xs text-red-500 mt-1">{locationLookupError}</p>}
        </div>

        {/* Destination Dropdown */}
        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
            To:
          </label>
          <select
            id="destination"
            value={selectedDestinationCityId}
            onChange={(e) => setSelectedDestinationCityId(e.target.value)}
            required
            disabled={!selectedDepartureCity || isLoadingDestinations || validDestinations.length === 0}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              {selectedDepartureCity ? (isLoadingDestinations ? 'Loading destinations...' : (validDestinations.length === 0 ? 'No routes found' : 'Select Destination')) : 'Select departure first'}
            </option>
            {validDestinations.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} {city.country ? `(${city.country.name})` : ''}
              </option>
            ))}
          </select>
           {destinationError && !isLoadingDestinations && <p className="text-xs text-red-500 mt-1">{destinationError}</p>}
        </div>


        <button
          type="submit"
          disabled={!selectedDepartureCity || !selectedDestinationCityId || isLoadingDestinations || isLoadingLocationsLookup}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Shuttles
        </button>
      </form>
  );
};

export default SearchForm;