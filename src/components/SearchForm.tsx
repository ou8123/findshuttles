"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Combobox } from '@headlessui/react';

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

  // State for departure city
  const [departureCities, setDepartureCities] = useState<CityLookup[]>([]);
  const [departureQuery, setDepartureQuery] = useState('');
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

  // Filter departure cities based on query
  const filteredDepartureCities = departureQuery === ''
    ? []
    : departureCities.filter(city => {
        const searchStr = departureQuery.toLowerCase();
        return (
          city.name.toLowerCase().includes(searchStr) ||
          city.countryName.toLowerCase().includes(searchStr)
        );
      });

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
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">Find Your Shuttle Route</h2>

      {/* Departure City Combobox */}
      <div className="mb-8">
        <label className="block text-lg font-medium text-gray-700 mb-2">
          From:
        </label>
        <Combobox value={selectedDepartureCity} onChange={setSelectedDepartureCity}>
          <div className="relative">
            <Combobox.Input<CityLookup>
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
              displayValue={(city) => city ? `${city.name}, ${city.countryName}` : ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDepartureQuery(event.target.value)}
              placeholder="Enter city or country name"
            />
            <Combobox.Options className="absolute z-10 w-full mt-1 bg-white shadow-xl max-h-60 rounded-lg py-2 text-base overflow-auto focus:outline-none sm:text-lg border border-gray-200">
              {filteredDepartureCities.map((city) => (
                <Combobox.Option
                  key={city.id}
                  value={city}
                  className={({ active }: { active: boolean }) =>
                    `relative cursor-pointer select-none py-3 px-4 ${
                      active ? 'bg-indigo-50 text-black' : 'text-gray-900'
                    }`
                  }
                >
                  {`${city.name}, ${city.countryName}`}
                </Combobox.Option>
              ))}
              {filteredDepartureCities.length === 0 && departureQuery !== '' && (
                <div className="py-3 px-4 text-gray-500">No cities found</div>
              )}
            </Combobox.Options>
          </div>
        </Combobox>
        {isLoadingLocationsLookup && <p className="text-sm text-gray-500 mt-2">Loading cities...</p>}
        {locationLookupError && <p className="text-sm text-red-600 mt-2">{locationLookupError}</p>}
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
              {`${city.name}, ${city.country?.name}`}
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
