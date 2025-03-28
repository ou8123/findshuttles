"use client"; // Needs client-side interactivity for form and data fetching

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Interface for the country data (can be shared)
interface Country {
    id: string;
    name: string;
    slug: string;
    // Add other fields if needed
}

const EditCountryPage = () => {
  const router = useRouter();
  const params = useParams(); // Hook to get dynamic route parameters
  const countryId = params?.countryId as string; // Get countryId from URL

  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState(''); // To compare if changed
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch the specific country data on mount
  useEffect(() => {
    if (!countryId) {
        setError("Country ID not found in URL.");
        setIsLoading(false);
        return;
    }

    const fetchCountry = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // NOTE: Fetching all and filtering client-side for simplicity.
        // A dedicated GET /api/admin/countries/[countryId] would be better.
        const response = await fetch(`/api/admin/countries`);
        if (!response.ok) throw new Error('Failed to fetch countries list');
        const countries: Country[] = await response.json();
        const countryData = countries.find(c => c.id === countryId);

        if (!countryData) {
          throw new Error('Country not found');
        }
        setName(countryData.name);
        setOriginalName(countryData.name); // Store original name

      } catch (err: unknown) {
        console.error("Failed to fetch country data:", err);
        let message = "Could not load country data.";
        if (err instanceof Error) {
            message = err.message;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountry();
  }, [countryId]); // Re-fetch if countryId changes (shouldn't normally)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Only submit if name has actually changed
    if (name.trim() === originalName.trim()) {
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }
    if (!name.trim()) {
      setSubmitStatus({ success: false, message: 'Country name cannot be empty.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`/api/admin/countries/${countryId}`, { // Use PUT to the specific country endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Success - redirect back to the countries list
      setSubmitStatus({ success: true, message: `Country "${result.name}" updated successfully!` });
      router.push('/admin/countries'); // Redirect to the list page

    } catch (error: unknown) {
      console.error("Failed to update country:", error);
      let message = "Failed to update country. Please try again.";
      if (error instanceof Error) {
          message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading country data...</div>;
  }

  if (error) {
    return (
        <div>
             <Link href="/admin/countries" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
                &larr; Back to Countries
            </Link>
            <p className="text-center p-4 text-red-600">{error}</p>
        </div>
    );
  }


  return (
    <div>
      <Link href="/admin/countries" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Countries
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Country</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md bg-white p-6 rounded-lg shadow-md">
        <div>
          <label htmlFor="country-name" className="block text-sm font-medium text-gray-700 mb-1">
            Country Name *
          </label>
          <input
            type="text"
            id="country-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" // Added text color
          />
        </div>

        <div className="pt-2">
          {submitStatus && (
            <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
              {submitStatus.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || name.trim() === originalName.trim()} // Disable if submitting or no change
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCountryPage;