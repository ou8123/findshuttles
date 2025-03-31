"use client";

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { XCircleIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

interface SearchFormProps {
  className?: string;
}

// Type definitions for better clarity
interface City {
  id: string;
  name: string;
  slug: string;
  countryName?: string;
  country?: {
    id: string;
    name: string;
  };
}

interface CountryWithCities {
  id: string;
  name: string;
  cities: City[];
}

/**
 * SearchForm Component
 * 
 * This component uses server-side form submission and redirect instead of client-side navigation.
 * This approach ensures a full page reload which solves issues with third-party widgets.
 * 
 * Performance optimized for handling large numbers of cities:
 * - Uses server-side search instead of loading all cities at once
 * - Implements debouncing to reduce API calls
 * - Shows popular cities by default for immediate options
 * - Enhanced autocomplete with text highlighting and better keyboard navigation
 */
const SearchForm: React.FC<SearchFormProps> = ({ 
  className = "max-w-2xl mx-auto"
}) => {
  // State for our internal locations data
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(false);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for departure city
  const [departureCities, setDepartureCities] = useState<City[]>([]);
  const [departureQuery, setDepartureQuery] = useState('');
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<City | null>(null);
  const [debouncedDepartureQuery, setDebouncedDepartureQuery] = useState('');
  
  // State for destination city
  const [validDestinations, setValidDestinations] = useState<City[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [selectedDestinationCityId, setSelectedDestinationCityId] = useState<string>('');

  // Create a debounce function for the search query
  useEffect(() => {
    // Don't trigger a search for very short queries (wait for more typing)
    if (departureQuery.length < 2) {
      setDebouncedDepartureQuery('');
      return;
    }
    
    // Set a timeout to update the debounced value after 300ms
    const handler = setTimeout(() => {
      setDebouncedDepartureQuery(departureQuery);
    }, 300);
    
    // Clean up the timeout if the query changes before the delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [departureQuery]);
  
  // Load popular cities on initial render
  useEffect(() => {
    const fetchPopularCities = async () => {
      setIsLoadingLocationsLookup(true);
      setLocationLookupError(null);
      try {
        // Get popular departure cities from the API
        const response = await fetch('/api/locations?departures_only=true&limit=10');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CountryWithCities[] = await response.json();
        
        // Flatten the country structure for the dropdown
        const popularCities = data.flatMap((country) => 
          country.cities.map((city) => ({
            ...city,
            countryName: country.name
          }))
        );
        
        console.log(`Loaded ${popularCities.length} popular cities for initial display`);
        setDepartureCities(popularCities);
      } catch (err: unknown) {
        console.error("Failed to fetch popular cities:", err);
        let message = "Could not load cities.";
        if (err instanceof Error) {
            message = err.message;
        }
        setLocationLookupError(message);
      } finally {
        setIsLoadingLocationsLookup(false);
      }
    };
    
    fetchPopularCities();
  }, []);

  // Search cities when the debounced query changes
  useEffect(() => {
    if (!debouncedDepartureQuery) return;
    
    const searchCities = async () => {
      setIsLoadingLocationsLookup(true);
      setLocationLookupError(null);
      try {
        // Search cities based on the debounced query
        const response = await fetch(`/api/locations?departures_only=true&q=${encodeURIComponent(debouncedDepartureQuery)}&limit=20`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CountryWithCities[] = await response.json();
        
        // Flatten the country structure for the dropdown
        const matchingCities = data.flatMap((country) => 
          country.cities.map((city) => ({
            ...city,
            countryName: country.name
          }))
        );
        
        console.log(`Found ${matchingCities.length} cities matching "${debouncedDepartureQuery}"`);
        setDepartureCities(matchingCities);
      } catch (err: unknown) {
        console.error("Failed to search cities:", err);
        let message = "Search failed.";
        if (err instanceof Error) {
            message = err.message;
        }
        setLocationLookupError(message);
      } finally {
        setIsLoadingLocationsLookup(false);
      }
    };
    
    searchCities();
  }, [debouncedDepartureQuery]);

  // Fetch valid destinations when a valid departure city is selected
  useEffect(() => {
    const fetchValidDestinations = async (departureId: string) => {
      setIsLoadingDestinations(true);
      setDestinationError(null);
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
      console.log("Fetching destinations for", selectedDepartureCity.name);
      fetchValidDestinations(selectedDepartureCity.id);
    } else {
      setValidDestinations([]);
      setSelectedDestinationCityId('');
      setDestinationError(null);
    }
  }, [selectedDepartureCity]);

  /**
   * Highlights the matching portion of text in search results
   */
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? <mark key={i} className="bg-yellow-100 px-0.5 rounded">{part}</mark> : part
          )}
        </>
      );
    } catch (e) {
      // Fallback in case the regex is invalid
      return text;
    }
  };

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
              <div className="relative w-full">
                <Combobox.Input
                  className="w-full h-10 px-3 pr-10 text-base border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                  displayValue={(city: any) => city ? `${city.name}, ${city.countryName}` : ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDepartureQuery(event.target.value)}
                  placeholder="Enter city or country name"
                  autoComplete="off"
                  spellCheck="false"
                  aria-autocomplete="none"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  {departureQuery && !isLoadingLocationsLookup ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setDepartureQuery('');
                        setDebouncedDepartureQuery('');
                        setSelectedDepartureCity(null);
                        // Ensure input field is cleared
                        const parent = e.currentTarget.closest('.relative');
                        if (parent) {
                          const input = parent.querySelector('input');
                          if (input) {
                            input.value = '';
                            input.focus();
                          }
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <XCircleIcon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Clear input</span>
                    </button>
                  ) : (
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
              
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => {
                  // Only clear the query if no city was selected
                  if (!selectedDepartureCity) {
                    setDepartureQuery('');
                  }
                }}
              >
                <Combobox.Options className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none border border-gray-200">
                  {isLoadingLocationsLookup && (
                    <div className="py-2 px-3 text-sm text-gray-500 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading cities...
                    </div>
                  )}
                  
                  {!isLoadingLocationsLookup && departureCities.length === 0 && departureQuery !== '' && (
                    <div className="py-2 px-3 text-gray-500">No cities found</div>
                  )}
                  
                  {!isLoadingLocationsLookup && departureCities.map((city) => (
                    <Combobox.Option
                      key={city.id}
                      value={city}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 px-3 ${
                          active ? 'bg-indigo-50 text-black' : 'text-gray-900'
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <div className="flex items-center">
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {highlightMatch(city.name, departureQuery)},&nbsp;
                              <span className="text-gray-500">{city.countryName}</span>
                            </span>
                          </div>
                          
                          {selected && (
                            <span
                              className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                                active ? 'text-indigo-600' : 'text-indigo-500'
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Transition>
            </div>
          </Combobox>
          {locationLookupError && (
            <p className="text-xs text-red-600 mt-1">{locationLookupError}</p>
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
