// @ts-nocheck
// Disable TypeScript checking for this file

import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Metadata } from 'next'; // Keep the import for potential future use or clarity

// Remove the type annotation ': Metadata'
export const metadata = {
  title: 'All Countries with Shuttle Routes | FindShuttles.com',
  description: 'Browse countries served by shuttle routes available on FindShuttles.com.',
};

async function fetchCountriesWithRouteCounts() {
  try {
    const countries = await prisma.country.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            // Count routes where this country is the departure country
            routesFrom: true, 
            // Count routes where this country is the destination country
            routesTo: true,   
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate total routes for each country
    const countriesWithTotalRoutes = countries.map(country => ({
      ...country,
      totalRoutes: country._count.routesFrom + country._count.routesTo,
    })).filter(country => country.totalRoutes > 0); // Only show countries with routes

    return countriesWithTotalRoutes;

  } catch (error) {
    console.error("Error fetching countries with route counts:", error);
    return []; // Return empty array on error
  }
}

export default async function CountriesIndexPage() {
  const countries = await fetchCountriesWithRouteCounts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Browse Shuttle Routes by Country</h1>
      
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-600 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <ol className="list-none p-0 inline-flex">
          <li className="flex items-center">
            <Link href="/" className="hover:underline">Home</Link>
          </li>
          <li className="flex items-center">
            <span className="mx-2">&raquo;</span>
            <span className="text-gray-900 dark:text-white font-semibold">Countries</span>
          </li>
        </ol>
      </nav>

      {countries.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {countries.map((country) => (
            <Link 
              key={country.id} 
              href={`/countries/${country.slug}`} 
              className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 transition-all"
            >
              <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">{country.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ({country.totalRoutes} {country.totalRoutes === 1 ? 'route' : 'routes'} available)
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No countries with available routes found.</p>
      )}
    </div>
  );
}
