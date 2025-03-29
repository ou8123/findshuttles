"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface City {
    id: string;
    name: string;
    country: { 
        name: string;
        slug: string;
    };
    slug: string;
}

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
  const [originalData, setOriginalData] = useState<Partial<RouteData>>({});
  const [isGenerating, setIsGenerating] = useState(false);

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
        const response = await fetch('/api/admin/cities');
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data: City[] = await response.json();
        setCities(data);
      } catch (err: unknown) {
        console.error("Failed to fetch cities for dropdown:", err);
        let message = "Could not load cities.";
        if (err instanceof Error) {
            message = err.message;
        }
        setCityError(message);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Update route slug and display name when cities change
  useEffect(() => {
    if (departureCityId && destinationCityId) {
      const departureCity = cities.find(c => c.id === departureCityId);
      const destinationCity = cities.find(c => c.id === destinationCityId);
      
      if (departureCity && destinationCity) {
        const defaultSlug = `${departureCity.country.slug}-${departureCity.slug}-to-${destinationCity.slug}`;
        const defaultDisplayName = `Shuttles from ${departureCity.name} to ${destinationCity.name}`;
        
        // Only update if not manually edited
        if (!routeSlug || routeSlug === originalData.routeSlug) {
          setRouteSlug(defaultSlug);
        }
        if (!displayName || displayName === originalData.displayName) {
          setDisplayName(defaultDisplayName);
        }
      }
    }
  }, [departureCityId, destinationCityId, cities, routeSlug, displayName, originalData.routeSlug, originalData.displayName]);

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
        const response = await fetch(`/api/admin/routes`);
        if (!response.ok) throw new Error('Failed to fetch routes list');
        const routes: RouteData[] = await response.json();
        const routeData = routes.find(r => r.id === routeId);

        if (!routeData) throw new Error('Route not found');

        // Populate form state
        setDepartureCityId(routeData.departureCityId);
        setDestinationCityId(routeData.destinationCityId);
        setRouteSlug(routeData.routeSlug);
        setDisplayName(routeData.displayName);
        setViatorWidgetCode(routeData.viatorWidgetCode);
        setMetaTitle(routeData.metaTitle ?? '');
        setMetaDescription(routeData.metaDescription ?? '');
        setMetaKeywords(routeData.metaKeywords ?? '');
        setSeoDescription(routeData.seoDescription ?? '');
        setOriginalData(routeData);

      } catch (err: unknown) {
        console.error("Failed to fetch route data:", err);
        let message = "Could not load route data.";
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

    const currentMetaTitle = metaTitle.trim() === '' ? null : metaTitle.trim();
    const currentMetaDesc = metaDescription.trim() === '' ? null : metaDescription.trim();
    const currentMetaKeywords = metaKeywords.trim() === '' ? null : metaKeywords.trim();
    const currentSeoDesc = seoDescription.trim() === '' ? null : seoDescription.trim();

    if (departureCityId === originalData.departureCityId &&
        destinationCityId === originalData.destinationCityId &&
        routeSlug === originalData.routeSlug &&
        displayName === originalData.displayName &&
        viatorWidgetCode === originalData.viatorWidgetCode &&
        currentMetaTitle === originalData.metaTitle &&
        currentMetaDesc === originalData.metaDescription &&
        currentMetaKeywords === originalData.metaKeywords &&
        currentSeoDesc === originalData.seoDescription) {
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
            seoDescription: currentSeoDesc
         }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      setSubmitStatus({ success: true, message: `Route updated successfully!` });
      router.push('/admin/routes');

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
            placeholder="e.g., Shuttles from Liberia Airport to Tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">This will be displayed as the title on the route page</p>
        </div>

        {/* Custom Slug */}
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
            placeholder="e.g., costa-rica-liberia-airport-to-tamarindo"
          />
          <p className="text-xs text-gray-500 mt-1">Format: country-departure-to-destination</p>
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
           placeholder="Add any specific details, attractions, or requirements you want to include in the generated content..."
           className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
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
               if (!departureCityId || !destinationCityId) {
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
                     departureCityId, 
                     destinationCityId,
                     additionalInstructions 
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
             disabled={isGenerating || !departureCityId || !destinationCityId}
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
