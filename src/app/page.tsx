import SearchFormWrapper from '@/components/SearchFormWrapper';

export default function Home() {
  return (
    <div>
      {/* Optional: Add a heading or introductory text */}
      <h1 className="text-2xl font-bold text-center mb-8">
        Find Your Shuttle Route
      </h1>

      {/* Render the SearchForm component */}
      <div className="max-w-md mx-auto"> {/* Center the form */}
        <SearchFormWrapper />
      </div>
    </div>
  );
}
