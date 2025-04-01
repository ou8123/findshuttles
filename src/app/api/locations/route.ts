import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(request: Request) {
  try {
    // Parse URL parameters
    const url = new URL(request.url);
    const onlyDepartures = url.searchParams.get('departures_only') === 'true';
    const searchQuery = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    console.log(`Fetching locations with departures_only=${onlyDepartures}, search="${searchQuery}", limit=${limit}`);

    // If there's a search query, perform an optimized search directly on cities
    if (searchQuery && searchQuery.length >= 2) {
      // Enhanced search with better prioritization for autocomplete
      const cities = await prisma.city.findMany({
        where: {
          OR: [
            // Priority 1: City names that start with the query (best match for autocomplete)
            { name: { startsWith: searchQuery, mode: 'insensitive' } },
            // Priority 2: City names that contain the query
            { name: { contains: searchQuery, mode: 'insensitive' } },
            // Priority 3: Country names that contain the query
            { country: { name: { contains: searchQuery, mode: 'insensitive' } } }
          ],
          // Only include departure cities if the flag is set
          ...(onlyDepartures ? { routesFrom: { some: {} } } : {})
        },
        select: {
          id: true,
          name: true,
          slug: true,
          country: {
            select: {
              id: true,
              name: true
            }
          }
        },
        take: limit
      });
      
      // Custom sorting for autocomplete relevance
      const sortedCities = cities.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();
        const queryLower = searchQuery.toLowerCase();
        
        // First priority: exact matches
        if (aNameLower === queryLower && bNameLower !== queryLower) return -1;
        if (bNameLower === queryLower && aNameLower !== queryLower) return 1;
        
        // Second priority: starts with query
        const aStartsWith = aNameLower.startsWith(queryLower);
        const bStartsWith = bNameLower.startsWith(queryLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;
        
        // Third priority: alphabetical order
        return aNameLower.localeCompare(bNameLower);
      });

      // Group sorted cities by country for consistent response format
      const countryMap = new Map();
      sortedCities.forEach(city => {
        if (!countryMap.has(city.country.id)) {
          countryMap.set(city.country.id, {
            id: city.country.id,
            name: city.country.name,
            cities: []
          });
        }
        countryMap.get(city.country.id).cities.push({
          id: city.id,
          name: city.name,
          slug: city.slug,
          country: {
            id: city.country.id,
            name: city.country.name
          }
        });
      });

      const searchResults = Array.from(countryMap.values());
      
      // Log results
      console.log(`Search found ${cities.length} matching cities`);
      
      return NextResponse.json(searchResults);
    }
    
    // For empty searches or very short queries, return popular/featured cities
    // This provides immediate options without loading all cities
    const featuredCitiesLimit = 10; // Limit to 10 cities for immediate display
    
    // Get popular departure cities (those with the most routes)
    if (onlyDepartures) {
      const popularDepartures = await prisma.city.findMany({
        where: {
          routesFrom: { some: {} }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          country: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: { routesFrom: true }
          }
        },
        orderBy: {
          routesFrom: { _count: 'desc' }
        },
        take: featuredCitiesLimit
      });
      
      // Group by country for consistent format
      const countryMap = new Map();
      popularDepartures.forEach(city => {
        if (!countryMap.has(city.country.id)) {
          countryMap.set(city.country.id, {
            id: city.country.id,
            name: city.country.name,
            cities: []
          });
        }
        countryMap.get(city.country.id).cities.push({
          id: city.id,
          name: city.name,
          slug: city.slug,
          country: {
            id: city.country.id,
            name: city.country.name
          }
        });
      });
      
      const featuredResults = Array.from(countryMap.values());
      console.log(`Returning ${popularDepartures.length} popular departure cities`);
      
      return NextResponse.json(featuredResults);
    }
    
    // If not searching and want all cities (unlikely use case, but still supported)
    // Get all countries with their cities, but limit the total number
    const countries = await prisma.country.findMany({
      include: {
        cities: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: {
              select: {
                id: true,
                name: true
              }
            },
            routesFrom: {
              select: {
                id: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          },
          ...(onlyDepartures ? { where: { routesFrom: { some: {} } } } : {}),
          take: Math.floor(limit / 2) // Split the limit across countries
        }
      },
      orderBy: {
        name: 'asc'
      },
      take: 5 // Limit to 5 countries for initial load
    });

    // Transform the data
    const processedCountries = countries.map(country => {
      return {
        id: country.id,
        name: country.name,
        slug: country.slug,
        cities: country.cities.map(({ id, name, slug, country }) => ({ 
          id, 
          name, 
          slug,
          country: {
            id: country.id,
            name: country.name
          }
        }))
      };
    }).filter(country => country.cities.length > 0);

    console.log(`Returning cities from ${processedCountries.length} countries`);
    return NextResponse.json(processedCountries);

  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
