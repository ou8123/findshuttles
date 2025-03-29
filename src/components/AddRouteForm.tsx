"use client";

import React, { useState, useEffect } from 'react';

// Define the expected structure of the location data from the API (for lookup)
interface CityLookup {
  id: string;
  name: string;
  slug: string;
  country: {
    name: string;
  };
}

interface CountryWithCitiesLookup {
  id: string;
  name: string;
  slug: string;
  cities: CityLookup[];
}

const AddRouteForm = () => {
  // State for internal locations lookup data
  const [locationsLookup, setLocationsLookup] = useState<CountryWithCitiesLookup[]>([]);
  const [isLoadingLocationsLookup, setIsLoadingLocationsLookup] = useState<boolean>(true);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);

  // State for selected cities
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<string>('');
  const [selectedDestinationCity, setSelectedDestinationCity] = useState<string>('');

  // State for form fields
  const [viatorWidgetCode, setViatorWidgetCode] = useState<string>('');
  const [metaTitle, setMetaTitle] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [metaKeywords, setMetaKeywords] = useState<string>('');
  const [seoDescription, setSeoDescription] = useState<string>('');

  // State for ChatGPT generation
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // State for submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch internal locations data on mount
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

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Validate that cities were selected
    if (!selectedDepartureCity || !selectedDestinationCity) {
        setSubmitStatus({ success: false, message: 'Please select both departure and destination cities.' });
        setIsSubmitting(false);
        return;
    }
    if (selectedDepartureCity === selectedDestinationCity) {
        setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same.' });
        setIsSubmitting(false);
        return;
    }
    if (!viatorWidgetCode) {
        setSubmitStatus({ success: false, message: 'Viator Widget Code is required.' });
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCityId: selectedDepartureCity,
          destinationCityId: selectedDestinationCity,
          viatorWidgetCode,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          metaKeywords: metaKeywords || undefined,
          seoDescription: seoDescription || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      // Success
      setSubmitStatus({ success: true, message: `Route created successfully! Slug: ${result.routeSlug}` });
      // Clear form
      setSelectedDepartureCity('');
      setSelectedDestinationCity('');
      setViatorWidgetCode('');
      setMetaTitle('');
      setMetaDescription('');
      setMetaKeywords('');
      setSeoDescription('');

    } catch (error: unknown) {
      console.error("Failed to submit new route:", error);
      let message = "Failed to create route. Please try again.";
      if (error instanceof Error) {
          message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a flat list of all cities with their country names
  const allCities = locationsLookup.flatMap(country => 
    country.cities.map(city => ({
      ...city,
      countryName: country.name
    }))
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Departure City Select */}
      <div>
        <label htmlFor="admin-departure" className="block text-sm font-medium text-gray-700 mb-1">
          Departure City *
        </label>
        <select
          id="admin-departure"
          value={selectedDepartureCity}
          onChange={(e) => setSelectedDepartureCity(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        >
          <option value="">Select departure city</option>
          {allCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}, {city.country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Destination City Select */}
      <div>
        <label htmlFor="admin-destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destination City *
        </label>
        <select
          id="admin-destination"
          value={selectedDestinationCity}
          onChange={(e) => setSelectedDestinationCity(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        >
          <option value="">Select destination city</option>
          {allCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}, {city.country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading/Error state for internal location data */}
      {isLoadingLocationsLookup && <p className="text-sm text-gray-500 mt-1">Loading existing location data...</p>}
      {locationLookupError && <p className="text-sm text-red-500 mt-1">{locationLookupError}</p>}

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
          placeholder="Paste the full HTML/script code from Viator here..."
        />
      </div>

      {/* Meta Title */}
      <div>
        <label htmlFor="meta-title" className="block text-sm font-medium text-gray-700 mb-1">
          Meta Title (60-70 characters)
        </label>
        <input
          id="meta-title"
          type="text"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        />
        <p className="text-sm text-gray-500 mt-1">{metaTitle.length} characters</p>
      </div>

      {/* Meta Description */}
      <div>
        <label htmlFor="meta-description" className="block text-sm font-medium text-gray-700 mb-1">
          Meta Description (150-160 characters)
        </label>
        <textarea
          id="meta-description"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={2}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        />
        <p className="text-sm text-gray-500 mt-1">{metaDescription.length} characters</p>
      </div>

      {/* Meta Keywords */}
      <div>
        <label htmlFor="meta-keywords" className="block text-sm font-medium text-gray-700 mb-1">
          Meta Keywords (comma-separated)
        </label>
        <input
          id="meta-keywords"
          type="text"
          value={metaKeywords}
          onChange={(e) => setMetaKeywords(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          placeholder="keyword1, keyword2, keyword3..."
        />
      </div>

      {/* SEO Description with Generate Button */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700">
            SEO Description
          </label>
          <button
            type="button"
            onClick={async () => {
              if (!selectedDepartureCity || !selectedDestinationCity) {
                setSubmitStatus({
                  success: false,
                  message: 'Please select both departure and destination cities first.'
                });
                return;
              }

              setIsGenerating(true);
              try {
                const response = await fetch('/api/admin/routes/generate-content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    departureCityId: selectedDepartureCity,
                    destinationCityId: selectedDestinationCity
                  }),
                });

                if (!response.ok) throw new Error('Failed to generate content');

                const data = await response.json();
                setMetaTitle(data.metaTitle || '');
                setMetaDescription(data.metaDescription || '');
                setMetaKeywords(data.metaKeywords || '');
                setSeoDescription(data.seoDescription || '');
                setSubmitStatus({
                  success: true,
                  message: 'Content generated successfully!'
                });
              } catch (error) {
                console.error('Error generating content:', error);
                setSubmitStatus({
                  success: false,
                  message: 'Failed to generate content. Please try again.'
                });
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating || !selectedDepartureCity || !selectedDestinationCity}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate with ChatGPT'}
          </button>
        </div>
        <textarea
          id="seo-description"
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          rows={8}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          placeholder="Enter a detailed description for search engines..."
        />
      </div>

      {/* Submit Button & Status Message */}
      <div className="pt-2">
        {submitStatus && (
          <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
            {submitStatus.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isLoadingLocationsLookup}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding Route...' : 'Add Route'}
        </button>
      </div>
    </form>
  );
};

export default AddRouteForm;