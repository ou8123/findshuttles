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
  const [locationsLookup, setLocationsLookup] = useState<CountryWithCitiesLookup[]>([]);
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(true);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for departure city autocomplete
  const [departureCities, setDepartureCities] = useState<CityLookup[]>([]);
  const [departureInput, setDepartureInput] = useState('');
  const [filteredDepartureCities, setFilteredDepartureCities] = useState<CityLookup[]>([]);
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<CityLookup | null>(null);
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
        setLocationsLookup(data);
        
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
        setLocationLookupError("Could not load location data for routing.");
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
        setFilteredDepartureCities([]);
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
      return;
    }

    const filtered = departureCities.filter(city => {
      const searchStr = departureInput.toLowerCase();
      return (
        city.name.toLowerCase().includes(searchStr) ||
        city.countryName.toLowerCase().includes(searchStr)
      );
    });
    setFilteredDepartureCities(filtered);
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
    }
  };

  const handleDepartureCitySelect = (city: CityLookup) => {
    setSelectedDepartureCity(city);
    setDepartureInput(`${city.name}, ${city.countryName}`);
    setFilteredDepartureCities([]);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDepartureCity || !selectedDestinationCityId) {
      alert("Please select a valid departure city and a destination from the list.");
      return;
    }

    const destinationCity = validDestinations.find(city => city.id === selectedDestinationCityId);

    // Find the country slug for the departure city
    let departureCountrySlug: string | undefined;
    for (const country of locationsLookup) {
      if (country.cities.some(city => city.id === selectedDepartureCity.id)) {
        departureCountrySlug = country.slug;
        break;
      }
    }

    if (departureCountrySlug && selectedDepartureCity.slug && destinationCity?.slug) {
      // Construct the route slug including the country
      const routeSlug = `${departureCountrySlug}-${selectedDepartureCity.slug}-to-${destinationCity.slug}`;
      console.log(`Navigating to route: /routes/${routeSlug}`);
      router.push(`/routes/${routeSlug}`);
    } else {
      alert("Could not construct route information. Please re-select departure and destination.");
      console.error("Slug or country slug missing for departure or destination", selectedDepartureCity, destinationCity, departureCountrySlug);
    }
  };

  return (
    <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Find Your Shuttles</h2>

      {/* Departure City Autocomplete */}
      <div ref={departureAutocompleteRef} className="relative">
        <label htmlFor="departure" className="block text-sm font-medium text-gray-700 mb-1">
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
            }
          }}
          placeholder="Enter departure city"
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
          required
          disabled={isLoadingLocationsLookup}
          autoComplete="off"
        />
        {isLoadingLocationsLookup && <p className="text-xs text-gray-500 mt-1">Loading cities...</p>}
        {locationLookupError && <p className="text-xs text-red-600 mt-1">{locationLookupError}</p>}
        
        {/* Departure Suggestions Dropdown */}
        {filteredDepartureCities.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {filteredDepartureCities.map((city) => (
              <div
                key={city.id}
                onClick={() => handleDepartureCitySelect(city)}
                className="cursor-pointer select-none relative py-2 px-3 hover:bg-indigo-50 text-black"
              >
                <div className="flex items-center">
                  <span className="font-normal block truncate">
                    {city.name}, {city.countryName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              {city.name} {city.country ? `(${city.country.name})` : ''}
            </option>
          ))}
        </select>
        {destinationError && !isLoadingDestinations && (
          <p className="text-xs text-red-600 mt-1">{destinationError}</p>
        )}
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
