import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all countries with their cities
  const countries = await prisma.country.findMany({
    orderBy: { name: 'asc' },
    include: {
      cities: {
        orderBy: { name: 'asc' },
      },
    },
  });

  // Fetch all routes
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

  // Base URL from environment or default
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://findshuttles.netlify.app';
  
  // Get current timestamp for lastModified
  const lastModified = new Date();

  // Generate sitemap items array
  const sitemapItems: MetadataRoute.Sitemap = [];

  // Add home page
  sitemapItems.push({
    url: `${baseUrl}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 1,
  });

  // Add all countries
  countries.forEach(country => {
    // For future country pages
    // sitemapItems.push({
    //   url: `${baseUrl}/countries/${country.slug}`,
    //   lastModified,
    //   changeFrequency: 'weekly',
    //   priority: 0.8,
    // });

    // Add all cities within each country
    country.cities.forEach(city => {
      // For future city pages
      // sitemapItems.push({
      //   url: `${baseUrl}/cities/${city.slug}`,
      //   lastModified,
      //   changeFrequency: 'weekly',
      //   priority: 0.7,
      // });
    });
  });

  // Add all routes
  routes.forEach(route => {
    sitemapItems.push({
      url: `${baseUrl}/routes/${route.routeSlug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
  });

  return sitemapItems;
}
