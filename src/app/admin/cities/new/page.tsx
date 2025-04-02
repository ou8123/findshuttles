"use client"; // Form requires client-side state and interaction

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Interface for Country data (for dropdown)
interface Country {
    id: string;
    name: string;
}

const AddCityPage = () => {
  const router = useRouter();

  // State for form fields
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [latitude, setLatitude] = useState<string>(''); // Use string for input flexibility
  const [longitude, setLongitude] = useState<string>('');

  // State for country dropdown
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);

  // State for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch countries for the dropdown
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      setCountryError(null);
      try {
        const response = await fetch('/api/admin/countries'); // Use the existing API
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    if (!name.trim() || !countryId) {
      setSubmitStatus({ success: false, message: 'City name and country are required.' });
      setIsSubmitting(false);
      return;
    }

    // Convert coordinates to numbers or null
    const latNum = latitude.trim() === '' ? null : parseFloat(latitude);
    const lngNum = longitude.trim() === '' ? null : parseFloat(longitude);

    if (latitude.trim() !== '' && isNaN(latNum as number)) {
         setSubmitStatus({ success: false, message: 'Invalid Latitude format (must be a number).' });
         setIsSubmitting(false);
         return;
    }
     if (longitude.trim() !== '' && isNaN(lngNum as number)) {
         setSubmitStatus({ success: false, message: 'Invalid Longitude format (must be a number).' });
         setIsSubmitting(false);
         return;
    }


    try {
      const response = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: name.trim(),
            countryId: countryId,
            latitude: latNum, // Send number or null
            longitude: lngNum // Send number or null
         }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Success - redirect back to the cities list
      setSubmitStatus({ success: true, message: `City "${result.name}" created successfully!` });
      router.push('/management-portal-8f7d3e2a1c/cities'); // Redirect to the list page

    } catch (error: unknown) {
      console.error("Failed to submit new city:", error);
      let message = "Failed to create city. Please try again.";
      if (error instanceof Error) {
          message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/management-portal-8f7d3e2a1c/cities" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Cities
      </Link>
      <h1 className="text-2xl font-bold mb-6">Add New City</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md bg-white p-6 rounded-lg shadow-md">
        {/* Country Dropdown */}
        <div>
          <label htmlFor="city-country" className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          {isLoadingCountries ? <p>Loading countries...</p> : countryError ? <p className="text-red-500">{countryError}</p> : (
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
          )}
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
            placeholder="e.g., San Jose"
          />
        </div>

         {/* Coordinates (Optional) */}
         <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="city-lat" className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude (Optional)
                </label>
                <input
                    type="number"
                    step="any" // Allow decimals
                    id="city-lat"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" // Added text color
                    placeholder="e.g., 9.9281"
                />
            </div>
             <div>
                <label htmlFor="city-lng" className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude (Optional)
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
            disabled={isSubmitting || isLoadingCountries}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add City'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCityPage;
