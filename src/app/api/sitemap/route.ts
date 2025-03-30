import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all countries
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
      include: {
        cities: {
          orderBy: { name: 'asc' },
        },
      },
    });

    // Fetch all routes to organize by departure country
    const routes = await prisma.route.findMany({
      include: {
        departureCity: {
          include: {
            country: true
          }
        },
        destinationCity: {
          include: {
            country: true
          }
        }
      }
    });

    // Group routes by departure country
    const routesByCountry = routes.reduce((acc, route) => {
      const countryId = route.departureCity.country.id;
      if (!acc[countryId]) {
        acc[countryId] = [];
      }
      acc[countryId].push(route);
      return acc;
    }, {} as Record<string, any[]>);

    // Get the base URL from the environment or use a default
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://findshuttles.netlify.app';

    // Get the current date for lastmod
    const today = new Date().toISOString().split('T')[0];

    // Build the XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add the homepage
    xml += `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

    // Add country-based navigation structure
    countries.forEach(country => {
      // Add country entry
      xml += `  <!-- Routes in ${country.name} -->\n`;
      
      // Get routes for this country
      const countryRoutes = routesByCountry[country.id] || [];
      
      // Add all routes departing from this country
      countryRoutes.forEach(route => {
        xml += `  <url>
    <loc>${baseUrl}/routes/${route.routeSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
      });
    });

    // Close the XML
    xml += '</urlset>';

    // Return the XML with proper content type
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', {
      status: 500,
    });
  }
}
