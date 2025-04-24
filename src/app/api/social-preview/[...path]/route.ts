import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOgImageUrl } from '@/lib/ogImage';

// Enable edge runtime for better performance
export const runtime = 'edge';

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Get the route slug from the path
    const routeSlug = params.path.join('/');

    // Fetch minimal route data
    const route = await prisma.route.findUnique({
      where: { routeSlug },
      select: {
        id: true,
        displayName: true,
        metaTitle: true,
        metaDescription: true,
        seoDescription: true,
        departureCity: {
          select: {
            name: true,
            country: {
              select: {
                name: true
              }
            }
          }
        },
        destinationCity: {
          select: {
            name: true,
            country: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!route) {
      return new Response('Not Found', { status: 404 });
    }

    // Generate title
    let title = route.metaTitle || route.displayName;
    if (!title) {
      title = `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`;
    }
    if (!title.includes('BookShuttles.com')) {
      title = `${title} | BookShuttles.com`;
    }

    // Generate OG image URL
    const ogImageUrl = generateOgImageUrl(
      route.departureCity.name,
      route.destinationCity.name
    );

    // Create lightweight HTML response
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${route.metaDescription || route.seoDescription || `Book shuttle transportation from ${route.departureCity.name} to ${route.destinationCity.name}`}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${route.metaDescription || `View shuttle options from ${route.departureCity.name} to ${route.destinationCity.name}`}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="BookShuttles.com">
  <meta property="fb:app_id" content="1354084628971632">
  <link rel="canonical" href="https://www.bookshuttles.com/routes/${routeSlug}">
</head>
<body>
  <h1>${title}</h1>
  <p>${route.metaDescription || route.seoDescription || `Book shuttle transportation from ${route.departureCity.name} to ${route.destinationCity.name}`}</p>
</body>
</html>`;

    // Return optimized response with caching headers
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'ALLOW-FROM https://www.facebook.com/',
        'Timing-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Social preview error:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}
