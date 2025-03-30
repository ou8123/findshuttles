"use client";

import React, { useState, useEffect } from 'react';
import { Combobox } from '@headlessui/react';

interface SearchFormProps {
  className?: string;
}

/**
 * SearchForm Component
 * 
 * This component uses server-side form submission and redirect instead of client-side navigation.
 * This approach ensures a full page reload which solves issues with third-party widgets.
 */
const SearchForm: React.FC<SearchFormProps> = ({ className = "max-w-2xl mx-auto" }) => {
  // State for our internal locations data
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(true);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for departure city
  const [departureCities, setDepartureCities] = useState<any[]>([]);
  const [departureQuery, setDepartureQuery] = useState('');
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<any | null>(null);

  // State for destination city
  const [validDestinations, setValidDestinations] = useState<any[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [selectedDestinationCityId, setSelectedDestinationCityId] = useState<string>('');

  // Fetch our internal locations data on mount
  useEffect(() => {
    const fetchLocationsLookup = async () => {
      setIsLoadingLocationsLookup(true);
      setLocationLookupError(null);
      try {
        // Get all cities, not just departure cities
        // This ensures new cities added in the admin interface are available in search
        const response = await fetch('/api/locations?departures_only=false');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Create flat list of cities with country names
        const allCities = data.flatMap((country: any) => 
          country.cities.map((city: any) => ({
            ...city,
            countryName: country.name
          }))
        );
        console.log(`Loaded ${allCities.length} cities for search dropdown`);
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
        const data = await response.json();
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

  /**
   * Client-side validation before server-side form submission
   * This will be the fallback if the HTML5 validation fails
   */
  const validateForm = () => {
    if (!selectedDepartureCity || !selectedDestinationCityId) {
      alert("Please select a valid departure city and a destination from the list.");
      return false;
    }
    return true;
  };

  return (
    <form 
      action="/api/search-redirect" 
      method="POST" 
      onSubmit={(e) => !validateForm() && e.preventDefault()} 
      className={`bg-white p-6 rounded-lg shadow-md ${className}`}
    >
      {/* These hidden fields will be submitted with the form */}
      <input 
        type="hidden" 
        name="departureCityId" 
        value={selectedDepartureCity?.id || ''} 
      />
      <input 
        type="hidden" 
        name="destinationCityId" 
        value={selectedDestinationCityId || ''} 
      />
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Find Your Shuttle Route</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Departure City Combobox */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From:
          </label>
          <Combobox value={selectedDepartureCity} onChange={setSelectedDepartureCity}>
            <div className="relative">
              <Combobox.Input
                className="w-full h-10 px-3 text-base border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                displayValue={(city: any) => city ? `${city.name}, ${city.countryName}` : ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDepartureQuery(event.target.value)}
                placeholder="Enter city or country name"
                autoComplete="off"
                spellCheck="false"
                aria-autocomplete="none"
              />
              <Combobox.Options className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none border border-gray-200">
                {filteredDepartureCities.map((city) => (
                  <Combobox.Option
                    key={city.id}
                    value={city}
                    className={({ active }: { active: boolean }) =>
                      `relative cursor-pointer select-none py-2 px-3 ${
                        active ? 'bg-indigo-50 text-black' : 'text-gray-900'
                      }`
                    }
                  >
                    {`${city.name}, ${city.countryName}`}
                  </Combobox.Option>
                ))}
                {filteredDepartureCities.length === 0 && departureQuery !== '' && (
                  <div className="py-2 px-3 text-gray-500">No cities found</div>
                )}
              </Combobox.Options>
            </div>
          </Combobox>
          {isLoadingLocationsLookup && <p className="text-xs text-gray-500 mt-1">Loading cities...</p>}
          {locationLookupError && <p className="text-xs text-red-600 mt-1">{locationLookupError}</p>}
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
            className="w-full h-10 px-3 text-base border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoComplete="off"
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
            <p className="text-xs text-red-600 mt-1">{destinationError}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!selectedDepartureCity || !selectedDestinationCityId || isLoadingDestinations || isLoadingLocationsLookup}
        className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 text-base rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Find Shuttles
      </button>
    </form>
  );
};

export default SearchForm;
