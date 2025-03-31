"use client"; // Mark as client component

import dynamic from 'next/dynamic';
import AdaptiveWidgetContainer from './AdaptiveWidgetContainer';

// Dynamically import the SearchForm component with no SSR
const SearchForm = dynamic(() => import('@/components/SearchForm'), {
  ssr: false, // This ensures the component only renders on the client side
  loading: () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Find Your Shuttle</h2>
      <p className="text-center text-gray-500">Loading search form...</p>
    </div>
  ),
});

export default function SearchFormWrapper() {
  return (
    <AdaptiveWidgetContainer>
      <SearchForm />
    </AdaptiveWidgetContainer>
  );
}
