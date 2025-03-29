"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  countryName: string;
}

interface CountryWithCitiesLookup {
  id: string;
  name: string;
  slug: string;
  cities: CityLookup[];
}

const SearchForm = () => {
  const router = useRouter();

  // State for our internal locations data
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(true);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for departure city autocomplete
  const [departureCities, setDepartureCities] = useState<CityLookup[]>([]);
  const [departureInput, setDepartureInput] = useState('');
  const [filteredDepartureCities, setFilteredDepartureCities] = useState<CityLookup[]>([]);
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<CityLookup | null>(null);
  const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false);
  const departureAutocompleteRef = useRef<HTMLDivElement>(null);

  // State for destination city
  const [validDestinations, setValidDestinations] = useState<DestinationCity[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [selectedDestinationCityId, setSelectedDestinationCityId] = useState<string>('');

  // Fetch our internal locations data on mount
  useEffect(() => {
    const fetchLocationsLookup = async () => {
      setIsLoadingLocationsLookup(true);
      setLocationLookupError(null);
      try {
        const response = await fetch('/api/locations');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CountryWithCitiesLookup[] = await response.json();
        
        // Create flat list of cities with country names
        const allCities = data.flatMap(country => 
          country.cities.map(city => ({
            ...city,
            countryName: country.name
          }))
        );
        setDepartureCities(allCities);
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

  // Handle clicks outside of departure autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (departureAutocompleteRef.current && !departureAutocompleteRef.current.contains(event.target as Node)) {
        setShowDepartureSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter departure cities based on input
  useEffect(() => {
    if (!departureInput.trim()) {
      setFilteredDepartureCities([]);
      setShowDepartureSuggestions(false);
      return;
    }

    const filtered = departureCities.filter(city => {
      const searchStr = departureInput.toLowerCase();
      return city.name.toLowerCase().includes(searchStr);
    });
    setFilteredDepartureCities(filtered);
    setShowDepartureSuggestions(true);
  }, [departureInput, departureCities]);

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
        if (err instanceof Error) {
          setDestinationError(err.message);
        } else {
          setDestinationError("Could not load destinations.");
        }
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    if (selectedDepartureCity) {
      fetchValidDestinations(selectedDepartureCity.id);
    } else {
      setValidDestinations([]);
      setSelectedDestinationCityId('');
      setDestinationError(null);
    }
  }, [selectedDepartureCity]);

  const handleDepartureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDepartureInput(value);
    if (!value) {
      setSelectedDepartureCity(null);
      setShowDepartureSuggestions(false);
    } else {
      setShowDepartureSuggestions(true);
    }
  };

  const handleDepartureCitySelect = (city: CityLookup) => {
    setSelectedDepartureCity(city);
    setDepartureInput(city.name);
    setShowDepartureSuggestions(false);
    setFilteredDepartureCities([]);
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

  return (
    <form onSubmit={handleSearch} className="bg-white p-8 rounded-lg shadow-lg space-y-8">
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">Find Your Shuttles</h2>

      {/* Departure City Autocomplete */}
      <div ref={departureAutocompleteRef} className="relative mb-8">
        <label htmlFor="departure" className="block text-lg font-medium text-gray-700 mb-2">
          From:
        </label>
        <input
          id="departure"
          type="text"
          value={departureInput}
          onChange={handleDepartureInputChange}
          onFocus={() => {
            if (selectedDepartureCity) {
              setDepartureInput('');
              setSelectedDepartureCity(null);
              setShowDepartureSuggestions(true);
            }
          }}
          placeholder="Enter departure city"
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
          required
          disabled={isLoadingLocationsLookup}
          autoComplete="off"
        />
        {isLoadingLocationsLookup && <p className="text-sm text-gray-500 mt-2">Loading cities...</p>}
        {locationLookupError && <p className="text-sm text-red-600 mt-2">{locationLookupError}</p>}
        
        {/* Departure Suggestions Dropdown */}
        {showDepartureSuggestions && filteredDepartureCities.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white shadow-xl max-h-60 rounded-lg py-2 text-base overflow-auto focus:outline-none sm:text-lg border border-gray-200">
            {filteredDepartureCities.map((city) => (
              <div
                key={city.id}
                onClick={() => handleDepartureCitySelect(city)}
                className="cursor-pointer select-none relative py-3 px-4 hover:bg-indigo-50 text-black"
              >
                <div className="flex items-center">
                  <span className="font-normal block truncate">
                    {city.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Destination Dropdown */}
      <div className="mb-8">
        <label htmlFor="destination" className="block text-lg font-medium text-gray-700 mb-2">
          To:
        </label>
        <select
          id="destination"
          value={selectedDestinationCityId}
          onChange={(e) => setSelectedDestinationCityId(e.target.value)}
          required
          disabled={!selectedDepartureCity || isLoadingDestinations || validDestinations.length === 0}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {selectedDepartureCity 
              ? (isLoadingDestinations 
                ? 'Loading destinations...' 
                : (validDestinations.length === 0 
                  ? 'No routes found' 
                  : 'Select destination'))
              : 'Select departure first'}
          </option>
          {validDestinations.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        {destinationError && !isLoadingDestinations && (
          <p className="text-sm text-red-600 mt-2">{destinationError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!selectedDepartureCity || !selectedDestinationCityId || isLoadingDestinations || isLoadingLocationsLookup}
        className="w-full bg-indigo-600 text-white py-4 px-6 text-lg rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Find Shuttles
      </button>
    </form>
  );
};

export default SearchForm;
