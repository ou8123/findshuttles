"use client"; // Needs client-side interactivity

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Interfaces for data
interface City {
    id: string;
    name: string;
    country: { name: string }; // Include country for display
}
interface RouteData {
    id: string;
    departureCityId: string;
    destinationCityId: string;
    viatorWidgetCode: string;
    seoDescription?: string | null;
    // Include other fields if needed for display/logic
}

const EditRoutePage = () => {
  const router = useRouter();
  const params = useParams();
  const routeId = params?.routeId as string;

  // Form state
  const [departureCityId, setDepartureCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [viatorWidgetCode, setViatorWidgetCode] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [originalData, setOriginalData] = useState<Partial<RouteData>>({});

  // City list state
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [cityError, setCityError] = useState<string | null>(null);

  // Loading/Submitting/Error state
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch cities for dropdowns
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityError(null);
      try {
        // Use the city API which includes country name
        const response = await fetch('/api/admin/cities');
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data: City[] = await response.json();
        setCities(data); // Assumes API returns cities sorted appropriately
      } catch (err: any) {
        console.error("Failed to fetch cities for dropdown:", err);
        setCityError("Could not load cities.");
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Fetch the specific route data
  useEffect(() => {
    if (!routeId) {
        setError("Route ID not found in URL.");
        setIsLoadingRoute(false);
        return;
    }

    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      setError(null);
      try {
        // Fetching all routes and filtering client-side for simplicity
        // A dedicated GET /api/admin/routes/[routeId] would be better
        const response = await fetch(`/api/admin/routes`);
        if (!response.ok) throw new Error('Failed to fetch routes list');
        const routes: RouteData[] = await response.json(); // Assuming API returns this shape
        const routeData = routes.find(r => r.id === routeId);

        if (!routeData) throw new Error('Route not found');

        // Populate form state
        setDepartureCityId(routeData.departureCityId);
        setDestinationCityId(routeData.destinationCityId);
        setViatorWidgetCode(routeData.viatorWidgetCode);
        setSeoDescription(routeData.seoDescription ?? ''); // Handle null
        setOriginalData({ // Store original values
            departureCityId: routeData.departureCityId,
            destinationCityId: routeData.destinationCityId,
            viatorWidgetCode: routeData.viatorWidgetCode,
            seoDescription: routeData.seoDescription
        });

      } catch (err: any) {
        console.error("Failed to fetch route data:", err);
        setError(err.message || "Could not load route data.");
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [routeId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Basic validation
    if (!departureCityId || !destinationCityId || !viatorWidgetCode) {
      setSubmitStatus({ success: false, message: 'Departure, Destination, and Viator Code are required.' });
      return;
    }
     if (departureCityId === destinationCityId) {
        setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same.' });
        return;
    }

    // Check if anything actually changed
    const currentSeoDesc = seoDescription.trim() === '' ? null : seoDescription.trim();
    if (departureCityId === originalData.departureCityId &&
        destinationCityId === originalData.destinationCityId &&
        viatorWidgetCode === originalData.viatorWidgetCode &&
        currentSeoDesc === originalData.seoDescription) {
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`/api/admin/routes/${routeId}`, { // PUT request
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            departureCityId,
            destinationCityId,
            viatorWidgetCode,
            seoDescription: currentSeoDesc // Send null if empty
         }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      setSubmitStatus({ success: true, message: `Route updated successfully!` });
      router.push('/admin/routes'); // Redirect on success

    } catch (error: any) {
      console.error("Failed to update route:", error);
      setSubmitStatus({ success: false, message: error.message || "Failed to update route." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading/error states
  if (isLoadingRoute || isLoadingCities) {
    return <div className="text-center p-4">Loading data...</div>;
  }
  if (error) {
    return (
        <div>
             <Link href="/admin/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
                &larr; Back to Routes
            </Link>
            <p className="text-center p-4 text-red-600">{error}</p>
        </div>
    );
  }
   if (cityError) {
     return <p className="text-center p-4 text-red-600">{cityError}</p>;
   }


  return (
    <div>
      <Link href="/admin/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Routes
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Route</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white p-6 rounded-lg shadow-md">
        {/* Departure City Dropdown */}
        <div>
          <label htmlFor="route-departure" className="block text-sm font-medium text-gray-700 mb-1">
            Departure City *
          </label>
           <select
              id="route-departure"
              value={departureCityId}
              onChange={(e) => setDepartureCityId(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="" disabled>Select Departure</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} ({city.country.name})
                </option>
              ))}
            </select>
        </div>

        {/* Destination City Dropdown */}
         <div>
          <label htmlFor="route-destination" className="block text-sm font-medium text-gray-700 mb-1">
            Destination City *
          </label>
           <select
              id="route-destination"
              value={destinationCityId}
              onChange={(e) => setDestinationCityId(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="" disabled>Select Destination</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} ({city.country.name})
                </option>
              ))}
            </select>
        </div>

        {/* Viator Widget Code */}
        <div>
            <label htmlFor="viator-code" className="block text-sm font-medium text-gray-700 mb-1">
            Viator Widget Code *
            </label>
            <textarea
            id="viator-code"
            value={viatorWidgetCode}
            onChange={(e) => setViatorWidgetCode(e.target.value)}
            required
            rows={6}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm text-gray-900"
            />
        </div>

       {/* SEO Description */}
       <div>
            <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700 mb-1">
            SEO Description
            </label>
            <textarea
            id="seo-description"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
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

export default EditRoutePage;