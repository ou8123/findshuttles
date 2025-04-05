import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base URL from environment or default (use the correct production URL)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bookshuttles.com'; 

  // Fetch all countries, including updatedAt
  const countries = await prisma.country.findMany({
    orderBy: { name: 'asc' },
    select: { 
      slug: true, 
      updatedAt: true // Fetch updatedAt for countries
    } 
  });

  // Fetch all routes, including updatedAt
  const routes = await prisma.route.findMany({
    select: { 
      routeSlug: true, 
      updatedAt: true // Fetch updatedAt for routes
    } 
  });

  // Generate sitemap items array
  const sitemapItems: MetadataRoute.Sitemap = [];
  
  // Get current date for static pages or fallback
  const lastModified = new Date(); 

  // Add home page
  sitemapItems.push({
    url: `${baseUrl}`,
    lastModified, // Use the defined variable here
    changeFrequency: 'daily',
    priority: 1,
  });

  // Add all countries
  countries.forEach(country => {
    // Add country pages
    sitemapItems.push({
      url: `${baseUrl}/countries/${country.slug}`,
      lastModified: country.updatedAt, // Use country's updatedAt
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    // Note: City pages are not currently implemented, so they remain commented out
    // country.cities.forEach(city => { ... });
  });

  // Add all routes
  routes.forEach(route => {
    sitemapItems.push({
      url: `${baseUrl}/routes/${route.routeSlug}`,
      lastModified: route.updatedAt, // Use route's updatedAt
      changeFrequency: 'weekly',
      priority: 0.9, // Higher priority for specific routes
    });
  });

  return sitemapItems;
}
