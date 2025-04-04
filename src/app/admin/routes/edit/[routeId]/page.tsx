"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ContentEditorControls from '@/components/ContentEditorControls';

interface City {
  id: string;
  name: string;
  country: {
    name: string;
  };
}

// Updated interface to include new fields
interface RouteData {
    id: string;
    departureCityId: string;
    destinationCityId: string;
    routeSlug: string;
    displayName: string;
    viatorWidgetCode: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    seoDescription?: string | null;
    travelTime?: string | null; 
    otherStops?: string | null; 
    // Note: hotelsServed is a relation, not fetched directly here usually
    departureCity: { name: string; id: string };
    destinationCity: { name: string; id: string };
}

const EditRoutePage = () => {
  const router = useRouter();
  const params = useParams();
  const routeId = params?.routeId as string;

  // Form state
  const [departureCityId, setDepartureCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [routeSlug, setRouteSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [viatorWidgetCode, setViatorWidgetCode] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [travelTime, setTravelTime] = useState(''); 
  const [otherStops, setOtherStops] = useState(''); 
  const [suggestedHotelsList, setSuggestedHotelsList] = useState<string[]>([]); // Added state for suggested hotels
  const [originalData, setOriginalData] = useState<RouteData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for city selection
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);

  // Loading/Submitting/Error state
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch all available cities
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityLoadError(null);
      try {
        const response = await fetch('/api/admin/cities'); 
        if (!response.ok) throw new Error(`Failed to fetch cities: ${response.status}`);
        const data = await response.json();
        const cities = data.cities || []; 
        console.log("Fetched cities:", cities.length);
        setAvailableCities(cities);
      } catch (err) {
        console.error("Failed to fetch cities:", err);
        setCityLoadError("Could not load city data. You can still edit other fields.");
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
        // Fetch the specific route directly
        let routeData: RouteData | null = null;
        
        try {
          console.log(`Attempting to fetch route with ID: ${routeId}`);
          const specificResponse = await fetch(`/api/admin/routes/${routeId}`);
          
          if (specificResponse.ok) {
            const specificData = await specificResponse.json();
            if (specificData && typeof specificData === 'object' && 'id' in specificData) {
              console.log("Successfully fetched route directly");
              // Ensure the fetched data conforms to RouteData, including optional fields
              routeData = {
                ...specificData,
                travelTime: specificData.travelTime ?? null,
                otherStops: specificData.otherStops ?? null,
              } as RouteData;
            }
          } else {
            console.warn(`Direct route fetch returned status: ${specificResponse.status}`);
          }
        } catch (specificErr) {
          console.warn("Could not fetch specific route, trying list fallback:", specificErr);
        }
        
        // Fallback logic removed for simplicity, assuming direct fetch should work or fail clearly.
        // If direct fetch fails consistently, the API endpoint needs investigation.

        if (!routeData) {
          throw new Error('Route not found or failed to fetch. Please check the route ID and API endpoint.');
        }

        console.log("Setting route data:", routeData);
        
        // Store original data
        setOriginalData(routeData);
        
        // Populate form state including new fields
        setDepartureCityId(routeData.departureCityId);
        setDestinationCityId(routeData.destinationCityId);
        setRouteSlug(routeData.routeSlug);
        setDisplayName(routeData.displayName);
        setViatorWidgetCode(routeData.viatorWidgetCode);
        setMetaTitle(routeData.metaTitle ?? '');
        setMetaDescription(routeData.metaDescription ?? '');
        setMetaKeywords(routeData.metaKeywords ?? '');
        setSeoDescription(routeData.seoDescription ?? '');
        setTravelTime(routeData.travelTime ?? ''); // Populate new state
        setOtherStops(routeData.otherStops ?? ''); // Populate new state
        // Note: suggestedHotelsList is not populated from initial fetch, only from generation
        
      } catch (err: unknown) {
        console.error("Failed to fetch route data:", err);
        let message = "Could not load route data. Please try again or contact support.";
        if (err instanceof Error) {
            message = err.message;
        }
        setError(message);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [routeId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!departureCityId || !destinationCityId || !viatorWidgetCode || !routeSlug || !displayName) {
      setSubmitStatus({ success: false, message: 'All required fields must be filled out.' });
      return;
    }
    if (departureCityId === destinationCityId) {
      setSubmitStatus({ success: false, message: 'Departure and destination cities cannot be the same.' });
      return;
    }

    // Prepare potentially null values
    const currentMetaTitle = metaTitle.trim() === '' ? null : metaTitle.trim();
    const currentMetaDesc = metaDescription.trim() === '' ? null : metaDescription.trim();
    const currentMetaKeywords = metaKeywords.trim() === '' ? null : metaKeywords.trim();
    const currentSeoDesc = seoDescription.trim() === '' ? null : seoDescription.trim();
    const currentTravelTime = travelTime.trim() === '' ? null : travelTime.trim(); 
    const currentOtherStops = otherStops.trim() === '' ? null : otherStops.trim(); 

    if (!originalData) {
      setSubmitStatus({ success: false, message: 'Original route data not found.' });
      return;
    }

    // Check if any data actually changed (excluding suggestedHotelsList as it's not saved here)
    if (departureCityId === originalData.departureCityId &&
        destinationCityId === originalData.destinationCityId &&
        routeSlug === originalData.routeSlug &&
        displayName === originalData.displayName &&
        viatorWidgetCode === originalData.viatorWidgetCode &&
        currentMetaTitle === originalData.metaTitle &&
        currentMetaDesc === originalData.metaDescription &&
        currentMetaKeywords === originalData.metaKeywords &&
        currentSeoDesc === originalData.seoDescription &&
        currentTravelTime === originalData.travelTime && 
        currentOtherStops === originalData.otherStops) { 
        setSubmitStatus({ success: false, message: 'No changes detected.' });
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`/api/admin/routes/${routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            departureCityId,
            destinationCityId,
            routeSlug,
            displayName,
            viatorWidgetCode,
            metaTitle: currentMetaTitle,
            metaDescription: currentMetaDesc,
            metaKeywords: currentMetaKeywords,
            seoDescription: currentSeoDesc,
            travelTime: currentTravelTime, 
            otherStops: currentOtherStops  
            // Note: hotelsServed relationship is NOT updated here
         }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      setSubmitStatus({ success: true, message: `Route updated successfully!` });
      
      // Update original data to reflect changes
      setOriginalData({
        ...originalData,
        departureCityId,
        destinationCityId,
        routeSlug,
        displayName,
        viatorWidgetCode,
        metaTitle: currentMetaTitle,
        metaDescription: currentMetaDesc,
        metaKeywords: currentMetaKeywords,
        seoDescription: currentSeoDesc,
        travelTime: currentTravelTime, 
        otherStops: currentOtherStops  
      });

    } catch (error: unknown) {
      console.error("Failed to update route:", error);
      let message = "Failed to update route.";
      if (error instanceof Error) {
          message = error.message;
      }
      setSubmitStatus({ success: false, message: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate content with OpenAI
  const handleGenerateContent = async () => {
    // Use current form state for departure/destination IDs
    if (!departureCityId || !destinationCityId) {
       setSubmitStatus({ success: false, message: 'Please select departure and destination cities first.' });
       return;
    }
    
    setIsGenerating(true);
    setSubmitStatus(null);
    setSuggestedHotelsList([]); // Clear previous suggestions
    
    try {
      const response = await fetch('/api/admin/routes/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureCityId,
          destinationCityId,
          additionalInstructions: additionalInstructions.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const data = await response.json();
      // Update all relevant fields from AI response
      setMetaTitle(data.metaTitle || '');
      setMetaDescription(data.metaDescription || '');
      setMetaKeywords(data.metaKeywords || '');
      setSeoDescription(data.seoDescription || '');
      setTravelTime(data.travelTime || ''); 
      setOtherStops(data.otherStops || ''); 
      setSuggestedHotelsList(data.suggestedHotels || []); // Update suggested hotels state
      
      setSubmitStatus({
        success: true,
        message: 'Content generated successfully! Review and save changes.' 
      });
    } catch (error) {
      console.error('Error generating content:', error);
      setSubmitStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate content. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingRoute) {
    return <div className="text-center p-4">Loading route data...</div>;
  }
  
  if (error) {
    return (
      <div>
        <Link href="/management-portal-8f7d3e2a1c/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
          &larr; Back to Routes
        </Link>
        <p className="text-center p-4 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link href="/management-portal-8f7d3e2a1c/routes" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Routes
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Route</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {/* ... (City selectors remain the same) ... */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Departure City Selection */}
          <div>
            <label htmlFor="departure-city" className="block text-sm font-medium text-gray-700 mb-1">
              Departure City *
            </label>
            {isLoadingCities ? (
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50">Loading cities...</div>
            ) : (
              <select
                id="departure-city"
                value={departureCityId}
                onChange={(e) => setDepartureCityId(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Select departure city</option>
                {availableCities.map((city) => (
                  <option key={`dep-${city.id}`} value={city.id}>
                    {city.name}, {city.country.name}
                  </option>
                ))}
              </select>
            )}
            {cityLoadError && <p className="text-xs text-red-600 mt-1">{cityLoadError}</p>}
          </div>
          
          {/* Destination City Selection */}
          <div>
            <label htmlFor="destination-city" className="block text-sm font-medium text-gray-700 mb-1">
              Destination City *
            </label>
            {isLoadingCities ? (
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50">Loading cities...</div>
            ) : (
              <select
                id="destination-city"
                value={destinationCityId}
                onChange={(e) => setDestinationCityId(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Select destination city</option>
                {availableCities.map((city) => (
                  <option key={`dest-${city.id}`} value={city.id}>
                    {city.name}, {city.country.name}
                  </option>
                ))}
              </select>
            )}
            {cityLoadError && <p className="text-xs text-red-600 mt-1">{cityLoadError}</p>}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name *
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Shuttles from Liberia to Tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">This will be displayed as the title on the route page</p>
        </div>

        {/* URL Slug */}
        <div>
          <label htmlFor="route-slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug *
          </label>
          <input
            id="route-slug"
            type="text"
            value={routeSlug}
            onChange={(e) => setRouteSlug(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., liberia-to-tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">Format: departure-to-destination</p>
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
            placeholder="Paste the full HTML/script code from Viator here..."
          />
        </div>

        {/* Travel Time */}
        <div>
          <label htmlFor="travel-time" className="block text-sm font-medium text-gray-700 mb-1">
            Travel Time (Optional)
          </label>
          <input
            id="travel-time"
            type="text"
            value={travelTime}
            onChange={(e) => setTravelTime(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Approx. 2-3 hours"
          />
           <p className="text-xs text-gray-500 mt-1">AI generated, can be edited.</p>
        </div>

        {/* Other Stops */}
        <div>
          <label htmlFor="other-stops" className="block text-sm font-medium text-gray-700 mb-1">
            Other Stops (Optional)
          </label>
          <input
            id="other-stops"
            type="text"
            value={otherStops}
            onChange={(e) => setOtherStops(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="e.g., Orotina, Herradura"
          />
           <p className="text-xs text-gray-500 mt-1">AI generated, can be edited.</p>
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

        {/* Additional Instructions */}
        <div>
          <label htmlFor="additional-instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Instructions for Content Generation
          </label>
          <textarea
            id="additional-instructions"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="Enter information about the route service, amenities, cities, hotels, etc..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Include details about the service, featured cities, hotels, or special amenities. 
            This content will be cleaned and formatted before sending to AI.
          </p>
        </div>

        {/* Content Editor Controls */}
        <ContentEditorControls
          additionalInstructions={additionalInstructions}
          setAdditionalInstructions={setAdditionalInstructions}
          seoDescription={seoDescription}
          setSeoDescription={setSeoDescription}
          isGenerating={isGenerating}
        />

        {/* SEO Description with Generate Button */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700">
              SEO Description
            </label>
            <button
              type="button"
              onClick={handleGenerateContent}
              disabled={isGenerating}
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

        {/* Suggested Hotels Display */}
        {suggestedHotelsList.length > 0 && (
          <div className="mt-4 p-3 border border-dashed border-gray-400 rounded-md bg-gray-50 dark:bg-gray-700">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">AI Suggested Hotels (Read-Only):</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-200 space-y-1">
              {suggestedHotelsList.map((hotel, index) => (
                <li key={index}>{hotel}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              Note: These are only suggestions. Use the (future) hotel management section to formally link hotels to this route.
            </p>
          </div>
        )}

      {/* Submit Button & Status Message */}
      <div className="pt-2">
        {submitStatus && (
          <p className={`mb-3 text-sm ${submitStatus.success ? 'text-green-600' : 'text-red-600'}`}>
            {submitStatus.message}
          </p>
        )}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Route'}
          </button>
          {originalData?.routeSlug && (
            <Link 
              href={`/routes/${originalData.routeSlug}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              View Route
            </Link>
          )}
          <Link href="/management-portal-8f7d3e2a1c/routes" className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
            Cancel
          </Link>
        </div>
        </div>
      </form>
    </div>
  );
};

export default EditRoutePage;
