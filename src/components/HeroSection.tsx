import React from 'react';

const HeroSection = () => {
  return (
    <section className="w-full bg-white py-12 px-4 md:px-8 lg:px-16 text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          Find Your Perfect Shuttle Service
        </h1>
        <p className="text-lg md:text-xl text-gray-700 mb-6">
          Simple booking for airport transfers and city-to-city shuttles.
         </p>
         <p className="text-base md:text-lg text-gray-600">
           From airport pickups and dropoffs to city-hopping, find the shuttles that fit your trip.
         </p>
       </div>
     </section>
  );
};

export default HeroSection;
