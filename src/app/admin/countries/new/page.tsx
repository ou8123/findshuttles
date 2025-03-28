"use client"; // This page needs client-side interactivity for the form

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const AddCountryPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    if (!name.trim()) {
      setSubmitStatus({ success: false, message: 'Country name cannot be empty.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/countries', {
        method: 'POST',
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
      setSubmitStatus({ success: true, message: `Country "${result.name}" created successfully!` });
      router.push('/admin/countries'); // Redirect to the list page

    } catch (error: unknown) {
      console.error("Failed to submit new country:", error);
      let message = "Failed to create country. Please try again.";
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
      <Link href="/admin/countries" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Countries
      </Link>
      <h1 className="text-2xl font-bold mb-6">Add New Country</h1>

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
            placeholder="e.g., Costa Rica"
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
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Country'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCountryPage;