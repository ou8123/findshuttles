"use client";

import React, { useState, useEffect, useCallback, Fragment, useRef } from 'react';
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
  // Create a ref for the combobox input
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State for our internal locations data
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(false);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for departure city
  const [departureCities, setDepartureCities] = useState<City[]>([]);
  const [departureQuery, setDepartureQuery] = useState('');
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<City | null>(null);
  const [debouncedDepartureQuery, setDebouncedDepartureQuery] = useState('');
  const [activeOption, setActiveOption] = useState<number>(-1);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // State for destination city
  const [validDestinations, setValidDestinations] = useState<City[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState<boolean>(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [selectedDestinationCityId, setSelectedDestinationCityId] = useState<string>('');

  // Detect mobile devices
  useEffect(() => {
    // Check if the device is mobile using screen width and/or user agent
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    // Initialize on mount
    checkMobile();
    
    // Re-check on window resize
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Create a debounce function for the search query
  useEffect(() => {
    // Don't trigger a search for very short queries (wait for more typing)
    if (departureQuery.length < 2) {
      setDebouncedDepartureQuery('');
      return;
    }
    
    // Shorter debounce time for mobile to make it feel more responsive
    const debounceTime = isMobile ? 150 : 300;
    
    // Set a timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedDepartureQuery(departureQuery);
    }, debounceTime);
    
    // Clean up the timeout if the query changes before the delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [departureQuery, isMobile]);
  
  // Load popular cities on initial render with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
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
        
        // Only update if we actually got cities back
        if (popularCities.length > 0) {
          console.log(`Loaded ${popularCities.length} popular cities for initial display`);
          setDepartureCities(popularCities);
          retryCount = 0; // Reset retry count on success
        } else {
          throw new Error("No cities returned from API");
        }
      } catch (err: unknown) {
        console.error("Failed to fetch popular cities:", err);
        let message = "Could not load cities.";
        if (err instanceof Error) {
          message = err.message;
        }
        setLocationLookupError(message);
        
        // Retry logic
        if (retryCount < maxRetries) {
          console.log(`Retrying fetch (${retryCount + 1}/${maxRetries})...`);
          retryCount++;
          setTimeout(fetchPopularCities, retryDelay);
          return; // Exit to avoid setting isLoadingLocationsLookup to false
        }
      } finally {
        if (retryCount >= maxRetries || !locationLookupError) {
          setIsLoadingLocationsLookup(false);
        }
      }
    };
    
    fetchPopularCities();
  }, []);

  // Cache of previously fetched cities for autocomplete
  const [citiesCache, setCitiesCache] = useState<{[query: string]: City[]}>({});
  
  // Search cities when the debounced query changes, with retry logic and caching
  useEffect(() => {
    if (!debouncedDepartureQuery) return;
    
    // Check cache first
    if (citiesCache[debouncedDepartureQuery]) {
      console.log(`Using cached results for "${debouncedDepartureQuery}"`);
      setDepartureCities(citiesCache[debouncedDepartureQuery]);
      setIsLoadingLocationsLookup(false);
      return;
    }
    
    let retryCount = 0;
    const maxRetries = 2;
    const retryDelay = 800; // 800ms
    
    const searchCities = async () => {
      setIsLoadingLocationsLookup(true);
      setLocationLookupError(null);
      try {
        // Cache buster to prevent stale responses
        const cacheBuster = new Date().getTime();
        
        // Search cities based on the debounced query
        const response = await fetch(
          `/api/locations?departures_only=true&q=${encodeURIComponent(debouncedDepartureQuery)}&limit=20&_=${cacheBuster}`,
          { cache: 'no-store' } // Ensure fresh response
        );
        
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
        
        // Update the cities cache
        setCitiesCache(prev => ({
          ...prev,
          [debouncedDepartureQuery]: matchingCities
        }));
        
        setDepartureCities(matchingCities);
      } catch (err: unknown) {
        console.error("Failed to search cities:", err);
        let message = "Search failed.";
        if (err instanceof Error) {
          message = err.message;
        }
        setLocationLookupError(message);
        
        // Retry logic for transient errors
        if (retryCount < maxRetries) {
          console.log(`Retrying search (${retryCount + 1}/${maxRetries})...`);
          retryCount++;
          setTimeout(searchCities, retryDelay);
          return; // Exit to avoid setting isLoadingLocationsLookup to false
        }
      } finally {
        if (retryCount >= maxRetries || !locationLookupError) {
          setIsLoadingLocationsLookup(false);
        }
      }
    };
    
    searchCities();
  }, [debouncedDepartureQuery, citiesCache]);

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
          <Combobox 
            value={selectedDepartureCity} 
            onChange={(city) => {
              setSelectedDepartureCity(city);
              // Close dropdown and remove focus when a city is selected
              setIsInputFocused(false);
              inputRef.current?.blur();
            }}
          >
            <div className="relative">
              <div className="relative w-full">
                <Combobox.Input
                  ref={inputRef}
                  className={`w-full border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-black ${
                    isMobile ? 'h-12 px-3 pr-10 text-base' : 'h-10 px-3 pr-10 text-base'
                  }`}
                  displayValue={(city: any) => city ? `${city.name}, ${city.countryName}` : ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setDepartureQuery(event.target.value);
                    // Reset active option when query changes
                    setActiveOption(-1);
                  }}
                  onFocus={() => {
                    // Set focus state and show cities when input is focused
                    setIsInputFocused(true);
                    setIsComboboxOpen(true);
                  }}
                  onBlur={() => {
                    // Reset focus state when input loses focus
                    setTimeout(() => {
                      setIsInputFocused(false);
                    }, 150); // Small delay to allow option selection before closing
                  }}
                  placeholder="Enter city or country name"
                  autoComplete="off"
                  spellCheck="false"
                  aria-autocomplete="list"
                  // Add these attributes to improve mobile experience
                  inputMode={isMobile ? "search" : undefined}
                  enterKeyHint="search"
                  onKeyDown={(e) => {
                    // Handle keyboard navigation
                    const filteredCities = departureCities.filter(city => {
                      if (!departureQuery || departureQuery.length < 2) return true;
                      const query = departureQuery.toLowerCase();
                      const cityName = city.name.toLowerCase();
                      const countryName = city.countryName?.toLowerCase() || '';
                      return cityName.includes(query) || cityName.startsWith(query) || countryName.includes(query);
                    });
                    
                    switch (e.key) {
                      case 'ArrowDown':
                        e.preventDefault();
                        setActiveOption(prev => 
                          prev < filteredCities.length - 1 ? prev + 1 : 0
                        );
                        break;
                      case 'ArrowUp':
                        e.preventDefault();
                        setActiveOption(prev => 
                          prev > 0 ? prev - 1 : filteredCities.length - 1
                        );
                        break;
                      case 'Enter':
                        if (activeOption >= 0 && activeOption < filteredCities.length) {
                          e.preventDefault();
                          setSelectedDepartureCity(filteredCities[activeOption]);
                          setDepartureQuery(`${filteredCities[activeOption].name}, ${filteredCities[activeOption].countryName}`);
                          setIsInputFocused(false);
                          inputRef.current?.blur();
                        }
                        break;
                      case 'Escape':
                        e.preventDefault();
                        // Clear selection if already selected, otherwise just close dropdown
                        if (selectedDepartureCity) {
                          setSelectedDepartureCity(null);
                          setDepartureQuery('');
                        }
                        setIsInputFocused(false);
                        inputRef.current?.blur();
                        break;
                    }
                  }}
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
                      className={`text-gray-400 hover:text-gray-600 focus:outline-none ${
                        isMobile ? 'p-2 -mr-2' : ''
                      }`}
                      aria-label="Clear input"
                    >
                      <XCircleIcon className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} aria-hidden="true" />
                      <span className="sr-only">Clear input</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        // Toggle dropdown visibility on mobile
                        if (isMobile) {
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }
                      }}
                      className={isMobile ? 'p-2 -mr-2' : ''}
                      aria-label="Show options"
                    >
                      <ChevronUpDownIcon
                        className={`text-gray-400 ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </div>
              
              <Transition
                as={Fragment}
                show={isInputFocused && departureQuery.length >= 2 && departureCities.length > 0}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
                afterLeave={() => {
                  // Only clear the query if no city was selected
                  if (!selectedDepartureCity) {
                    setDepartureQuery('');
                  }
                  setIsComboboxOpen(false);
                }}
              >
                <Combobox.Options 
                  className={`absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md py-1 text-base overflow-auto focus:outline-none border border-gray-200 ${
                    isMobile ? 'max-h-[50vh]' : 'max-h-60'
                  }`}
                >
                  {isLoadingLocationsLookup && (
                    <div className="py-2 px-3 text-sm text-gray-500 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading cities...
                    </div>
                  )}
                  
                  {/* No results message */}
                  {!isLoadingLocationsLookup && departureCities.filter(city => {
                    if (!departureQuery || departureQuery.length < 2) return true;
                    const query = departureQuery.toLowerCase();
                    const cityName = city.name.toLowerCase();
                    const countryName = city.countryName?.toLowerCase() || '';
                    return cityName.includes(query) || cityName.startsWith(query) || countryName.includes(query);
                  }).length === 0 && departureQuery !== '' && (
                    <div className="py-2 px-3 text-gray-500">No cities found</div>
                  )}
                  
                  {/* Filter and display cities */}
                  {departureCities
                    .filter(city => {
                      if (!departureQuery || departureQuery.length < 2) return true;
                      const query = departureQuery.toLowerCase();
                      const cityName = city.name.toLowerCase();
                      const countryName = city.countryName?.toLowerCase() || '';
                      return cityName.includes(query) || cityName.startsWith(query) || countryName.includes(query);
                    })
                    .map((city, index) => (
                    <Combobox.Option
                      key={city.id}
                      value={city}
                      className={({ active }) =>
                        `relative cursor-default select-none ${isMobile ? 'py-3' : 'py-2'} px-3 ${
                          active || index === activeOption ? 'bg-indigo-50 text-black' : 'text-gray-900'
                        } ${isMobile ? 'touch-manipulation' : ''}`
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
          <div className="relative">
            <select
              id="destination"
              value={selectedDestinationCityId}
              onChange={(e) => setSelectedDestinationCityId(e.target.value)}
              required
              disabled={!selectedDepartureCity || isLoadingDestinations || validDestinations.length === 0}
              className={`w-full border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-black disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none ${
                isMobile ? 'h-12 px-3 pr-10 text-base' : 'h-10 px-3 pr-10 text-base' 
              }`}
              autoComplete="off"
              aria-label="Select destination city"
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
            {/* Custom dropdown arrow for consistent styling */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon 
                className={`text-gray-400 ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} 
                aria-hidden="true" 
              />
            </div>
          </div>
          {destinationError && !isLoadingDestinations && (
            <p className="text-xs text-red-600 mt-1" role="alert">{destinationError}</p>
          )}
          {isLoadingDestinations && (
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading destinations...
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!selectedDepartureCity || !selectedDestinationCityId || isLoadingDestinations || isLoadingLocationsLookup}
        className={`w-full mt-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${
          isMobile ? 'py-3 px-4 text-lg' : 'py-2 px-4 text-base'
        }`}
      >
        Find Shuttles
      </button>
    </form>
  );
};

export default SearchForm;
