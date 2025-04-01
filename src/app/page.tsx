import HomeSearchForm from '@/components/HomeSearchForm';

export default function Home() {
  return (
    <>
      {/* Search area with dark green background - full width */}
      <div 
        style={{ 
          backgroundColor: '#004d3b',
          width: '100vw',
          position: 'relative',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          marginTop: '-12px', // Increased negative margin to ensure it's flush with header
        }}
      >
        <main className="flex flex-col items-center justify-start py-16 sm:py-24">
          <div className="w-full max-w-3xl px-4">
            <HomeSearchForm />
          </div>
        </main>
      </div>
      
      {/* Additional content area with white background */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-semibold text-[#004d3b] mb-6">Find Your Perfect Shuttle Service</h2>
          <p className="text-gray-700 mb-4">
            Easy booking for shuttle services between major cities and popular destinations.
          </p>
          <p className="text-gray-700 mb-4">
            Whether you're traveling for business or pleasure, we make it simple to find and book reliable shuttle transportation.
          </p>
        </div>
      </div>
    </>
  );
}
