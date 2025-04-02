import HomeSearchForm from '@/components/HomeSearchForm';
import HeroSection from '@/components/HeroSection'; // Import the new component

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
      
      {/* Use the new HeroSection component */}
      <HeroSection />
    </>
  );
}
