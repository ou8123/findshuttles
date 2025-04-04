// @ts-nocheck
// Disable TypeScript checking for this file

import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import CountryRouteFilter from '@/components/CountryRouteFilter'; // Import the client component

// Generate metadata function
export async function generateMetadata({ params }) {
  const { countrySlug } = params;
  const data = await fetchCountryData(countrySlug); // Reuse the data fetching logic

  if (!data || !data.country) {
    // Return metadata for a not found page or a default
    return {
      title: 'Country Routes Not Found | FindShuttles.com',
      description: 'Could not find shuttle routes for the specified country.',
    };
  }

  const countryName = data.country.name;
  // Use Costa Rica specific description if applicable, otherwise generic
  const metaDescription = countrySlug === 'costa-rica'
    ? `Browse professional, point-to-point shuttle routes throughout Costa Rica. Explore transportation options between San José, La Fortuna, Monteverde, Manuel Antonio, and more.`
    : `Browse professional, point-to-point shuttle routes throughout ${countryName}. Explore transportation options between major cities and destinations.`;

  return {
    title: `Shuttle Routes in ${countryName} | FindShuttles.com`,
    description: metaDescription,
    // Add keywords later if needed
  };
}

// Fetch country data, associated routes, and filterable cities
async function fetchCountryData(countrySlug) {
  try {
    // 1. Fetch the country by slug
    const country = await prisma.country.findUnique({
      where: { slug: countrySlug },
    });

    if (!country) {
      console.log(`Country not found for slug: ${countrySlug}`);
      return null; // Will trigger notFound() later
    }

    // 2. Fetch routes associated with this country
    const routes = await prisma.route.findMany({
      where: {
        OR: [
          { departureCountryId: country.id },
          { destinationCountryId: country.id },
        ],
      },
      // Select specific fields including travelTime
      select: {
        id: true,
        routeSlug: true,
        travelTime: true, // Added travelTime
        departureCity: { 
          select: { 
            id: true, 
            name: true, 
            countryId: true, 
            country: { select: { name: true } } 
          } 
        }, 
        destinationCity: { 
          select: { 
            id: true, 
            name: true, 
            countryId: true 
          } 
        },
      },
      orderBy: [
        { departureCity: { name: 'asc' } },
        { destinationCity: { name: 'asc' } },
      ],
    });

    // 3. Get a distinct list of cities within this country that are part of these routes
    const cityIdsInRoutes = new Set();
    routes.forEach(route => {
      // Check if the city belongs to the current country before adding
      if (route.departureCity?.countryId === country.id) {
         cityIdsInRoutes.add(route.departureCity.id);
      }
      if (route.destinationCity?.countryId === country.id) {
         cityIdsInRoutes.add(route.destinationCity.id);
      }
    });

    const cities = await prisma.city.findMany({
      where: {
        id: { in: Array.from(cityIdsInRoutes) },
        // countryId: country.id, // Redundant check as cityIdsInRoutes should already be filtered
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { country, routes, cities };

  } catch (error) {
    console.error(`Error fetching data for country ${countrySlug}:`, error);
    return null; // Handle errors gracefully
  }
}

export default async function CountryRoutesPage({ params }) {
  const { countrySlug } = params;

  // Fetch data for the country
  const data = await fetchCountryData(countrySlug);

  // If no country found, show 404
  if (!data || !data.country) {
    notFound();
  }

  const { country, routes, cities } = data;

  // TODO: Replace this static content with dynamic content based on the country
  const pageContent = {
    title: `Shuttle Routes in ${country.name} | FindShuttles.com`,
    metaDescription: `Browse professional, point-to-point shuttle routes throughout ${country.name}. Explore transportation options between major cities and destinations.`, // Generic version
    introParagraph1: `Find reliable shuttle routes across ${country.name} with BookShuttles.com. Whether you're heading from the capital to the coast or exploring inland regions, BookShuttles.com connects you to convenient, professionally operated shuttle services across the country. Popular routes include transport between major cities and top destinations. Many shuttles offer air-conditioned vehicles and direct service for a smooth travel experience.`,
    introParagraph2: `If ${country.name} is on your itinerary, prepare to experience its diverse landscapes and unforgettable sights. From bustling cities to natural wonders, ${country.name} offers something for every kind of traveler. Whether you're visiting national parks, historical sites, or catching a connecting shuttle, this list of shuttle routes can help you plan seamless travel between key locations.`,
    disclaimer: `Route descriptions often refer only to the first listing shown. Amenities and services vary by provider. Please review individual listings before booking.`,
    browsePrompt: `Browse available ${country.name} shuttle routes below and book your transport with confidence.`
  };

  // Use Costa Rica specific content if it's Costa Rica
  if (country.slug === 'costa-rica') {
    pageContent.metaDescription = `Browse professional, point-to-point shuttle routes throughout Costa Rica. Explore transportation options between San José, La Fortuna, Monteverde, Manuel Antonio, and more.`;
    pageContent.introParagraph1 = `Find reliable shuttle routes across Costa Rica with BookShuttles.com. Whether you're heading from the capital to the coast or exploring inland rainforests, BookShuttles.com connects you to convenient, professionally operated shuttle services across the country. Popular routes include transport between San José, La Fortuna, Tamarindo, Monteverde, Manuel Antonio, and other top destinations. Many shuttles offer air-conditioned vehicles and direct service for a smooth travel experience.`;
    pageContent.introParagraph2 = `If Costa Rica is on your itinerary, prepare to experience its diverse landscapes and unforgettable sights. From the cloud forests of Monteverde to the beaches of Tamarindo and the volcanic hot springs in La Fortuna, Costa Rica offers something for every kind of traveler. Whether you're visiting national parks like Manuel Antonio or catching a connecting shuttle to a surf town or eco-lodge, this list of shuttle routes can help you plan seamless travel between key locations.`;
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{pageContent.title.replace(' | FindShuttles.com', '')}</h1>
      
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-600 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <ol className="list-none p-0 inline-flex">
          <li className="flex items-center">
            <Link href="/" className="hover:underline">Home</Link>
          </li>
          <li className="flex items-center">
            <span className="mx-2">&raquo;</span>
            {/* Link to the new countries index page */}
            <Link href="/countries" className="hover:underline">Countries</Link> 
          </li>
          <li className="flex items-center">
            <span className="mx-2">&raquo;</span>
            <span className="text-gray-900 dark:text-white font-semibold">{country.name}</span>
          </li>
        </ol>
      </nav>
      
      <p className="mb-4 text-gray-700 dark:text-gray-300">{pageContent.introParagraph1}</p>
      <p className="mb-6 text-gray-700 dark:text-gray-300">{pageContent.introParagraph2}</p>
      
      <p className="text-sm italic text-red-600 dark:text-red-400 font-bold mb-6">
        {pageContent.disclaimer}
      </p>

      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Available Routes in {country.name}</h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300">{pageContent.browsePrompt}</p>

      {/* Render the client component for filtering and displaying routes */}
      <CountryRouteFilter 
        country={country} 
        initialRoutes={routes} 
        cities={cities} 
      />
    </div>
  );
}
