"use client";

import React, { useState, useEffect } from 'react';
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

  // State for departure city
  const [selectedDepartureCityId, setSelectedDepartureCityId] = useState<string>('');
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<CityLookup | null>(null);

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
      } catch (err: unknown) {
        console.error("Failed to fetch internal locations lookup:", err);
        setLocationLookupError("Could not load location data for routing.");
      } finally {
        setIsLoadingLocationsLookup(false);
      }
    };
    fetchLocationsLookup();
  }, []);

  // Update selected departure city when ID changes
  useEffect(() => {
    if (selectedDepartureCityId) {
      for (const country of locationsLookup) {
        const city = country.cities.find(c => c.id === selectedDepartureCityId);
        if (city) {
          setSelectedDepartureCity(city);
          return;
        }
      }
    } else {
      setSelectedDepartureCity(null);
    }
  }, [selectedDepartureCityId, locationsLookup]);

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

    if (selectedDepartureCityId) {
      fetchValidDestinations(selectedDepartureCityId);
    } else {
      setValidDestinations([]);
      setSelectedDestinationCityId('');
      setDestinationError(null);
    }
  }, [selectedDepartureCityId]);

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

  // Group cities by country for the departure dropdown
  const groupedCities = locationsLookup.map(country => ({
    country: country.name,
    cities: country.cities.map(city => ({
      id: city.id,
      name: city.name,
      label: `${city.name}, ${country.name}`
    }))
  }));

  return (
    <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Find Your Shuttles</h2>

      {/* Departure City Dropdown */}
      <div>
        <label htmlFor="departure" className="block text-sm font-medium text-gray-700 mb-1">
          From:
        </label>
        <select
          id="departure"
          value={selectedDepartureCityId}
          onChange={(e) => setSelectedDepartureCityId(e.target.value)}
          required
          disabled={isLoadingLocationsLookup}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select departure city</option>
          {groupedCities.map(group => (
            <optgroup key={group.country} label={group.country}>
              {group.cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {isLoadingLocationsLookup && <p className="text-xs text-gray-500 mt-1">Loading cities...</p>}
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
          disabled={!selectedDepartureCityId || isLoadingDestinations || validDestinations.length === 0}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {selectedDepartureCityId 
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
          <p className="text-xs text-red-500 mt-1">{destinationError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!selectedDepartureCityId || !selectedDestinationCityId || isLoadingDestinations || isLoadingLocationsLookup}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Find Shuttles
      </button>
    </form>
  );
};

export default SearchForm;
