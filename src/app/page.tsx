import dynamic from 'next/dynamic';

// Dynamically import the SearchForm component with no SSR
const SearchForm = dynamic(() => import('@/components/SearchForm'), {
  ssr: false,
  loading: () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Find Your Shuttle</h2>
      <p className="text-center text-gray-500">Loading search form...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 md:p-12 lg:p-24">
      <div className="w-full max-w-3xl">
        <SearchForm className="rounded-lg shadow-md" />
      </div>
    </main>
  );
}
