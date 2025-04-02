"use client"; // Needs client-side interactivity

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Interfaces for data
interface Country {
    id: string;
    name: string;
}
interface City {
    id: string;
    name: string;
    slug: string;
    latitude?: number | null;
    longitude?: number | null;
    countryId: string;
    country?: { // May not be included in initial fetch, depending on API
        name: string;
    };
}

const EditCityPage = () => {
  const router = useRouter();
  const params = useParams();
  const cityId = params?.cityId as string;

  // Form state
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [originalData, setOriginalData] = useState<Partial<City>>({}); // Store original data

  // Country list state
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);

  // Loading/Submitting/Error state
  const [isLoadingCity, setIsLoadingCity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch countries for dropdown
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      setCountryError(null);
      try {
        const response = await fetch('/api/admin/countries');
        if (!response.ok) throw new Error('Failed to fetch countries');
        const data: Country[] = await response.json();
        setCountries(data);
      } catch (err: unknown) {
        console.error("Failed to fetch countries for dropdown:", err);
        let message = "Could not load countries.";
        if (err instanceof Error) {
            message = err.message;
        }
        setCountryError(message);
      } finally {
        setIsLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch the specific city data
  useEffect(() => {
    if (!cityId) {
        setError("City ID not found in URL.");
        setIsLoadingCity(false);
        return;
    }

    const fetchCity = async () => {
      setIsLoadingCity(true);
      setError(null);
      try {
        // Fetching all cities and filtering client-side for simplicity
        // A dedicated GET /api/admin/cities/[cityId] would be better
        const response = await fetch(`/api/admin/cities`);
        if (!response.ok) throw new Error('Failed to fetch cities list');
        const cities: City[] = await response.json(); // Assumes API returns City with country { name }
        const cityData = cities.find(c => c.id === cityId);

        if (!cityData) throw new Error('City not found');

        // Populate form state
        setName(cityData.name);
        setCountryId(cityData.countryId);
        setLatitude(cityData.latitude?.toString() ?? ''); // Convert number/null to string
        setLongitude(cityData.longitude?.toString() ?? '');
        setOriginalData({ // Store original values to check for changes
            name: cityData.name,
            countryId: cityData.countryId,
            latitude: cityData.latitude,
            longitude: cityData.longitude
        });

      } catch (err: unknown) {
        console.error("Failed to fetch city data:", err);
        let message = "Could not load city data.";
        if (err instanceof Error) {
            message = err.message;
        }
        setError(message);
      } finally {
        setIsLoadingCity(false);
      }
    };

    fetchCity();
  }, [cityId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Convert coordinates to numbers or null
    const latNum = latitude.trim() === '' ? null : parseFloat(latitude);
    const lngNum = longitude.trim() === '' ? null : parseFloat(longitude);

    // Basic validation
    if (!name.trim() || !countryId) {
      setSubmitStatus({ success: false, message: 'City name and country are required.' });
      return;
    }
     if (latitude.trim() !== '' && isNaN(latNum as number)) {
         setSubmitStatus({ success: false, message: 'Invalid Latitude format (must be a number).' });
         return;
    }
     if (longitude.trim() !== '' && isNaN(lngNum as number)) {
         setSubmitStatus({ success: false, message: 'Invalid Longitude format (must be a number).' });
         return;
    }

    // Check if anything actually changed
    if (name.trim() === originalData.name &&
        countryId === originalData.countryId &&
        latNum === originalData.latitude && // Compare parsed numbers/null
        lngNum === originalData.longitude) {
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }


    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`/api/admin/cities/${cityId}`, { // PUT request
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name.trim(),
            countryId: countryId,
            latitude: latNum,
            longitude: lngNum
         }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      setSubmitStatus({ success: true, message: `City "${result.name}" updated successfully!` });
      router.push('/management-portal-8f7d3e2a1c/cities'); // Redirect on success

    } catch (error: unknown) {
      console.error("Failed to update city:", error);
      let message = "Failed to update city.";
      if (error instanceof Error) {
          message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading/error states
  if (isLoadingCity || isLoadingCountries) {
    return <div className="text-center p-4">Loading data...</div>;
  }
  if (error) {
    return (
        <div>
             <Link href="/management-portal-8f7d3e2a1c/cities" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
                &larr; Back to Cities
            </Link>
            <p className="text-center p-4 text-red-600">{error}</p>
        </div>
    );
  }
   if (countryError) {
     return <p className="text-center p-4 text-red-600">{countryError}</p>;
   }


  return (
    <div>
      <Link href="/management-portal-8f7d3e2a1c/cities" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Cities
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit City</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md bg-white p-6 rounded-lg shadow-md">
        {/* Country Dropdown */}
        <div>
          <label htmlFor="city-country" className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
           <select
              id="city-country"
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="" disabled>Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
        </div>

        {/* City Name */}
        <div>
          <label htmlFor="city-name" className="block text-sm font-medium text-gray-700 mb-1">
            City Name *
          </label>
          <input
            type="text"
            id="city-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" // Added text color
          />
        </div>

         {/* Coordinates */}
         <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="city-lat" className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                </label>
                <input
                    type="number"
                    step="any"
                    id="city-lat"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" // Added text color
                    placeholder="e.g., 9.9281"
                />
            </div>
             <div>
                <label htmlFor="city-lng" className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                </label>
                <input
                    type="number"
                    step="any"
                    id="city-lng"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" // Added text color
                    placeholder="e.g., -84.0907"
                />
            </div>
         </div>

        {/* Submit Button & Status */}
        <div className="pt-2">
          {submitStatus && (
            <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
              {submitStatus.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCityPage;
