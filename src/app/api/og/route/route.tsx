import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react';
import fs from 'fs/promises'; // Use promise-based fs
import path from 'path';

// Enable ISR with 1 hour revalidation
export const dynamic = 'force-static';
export const revalidate = 3600;

// Re-enable edge runtime for better performance
export const runtime = "edge";

// Removed getFontData function - will read file directly

// Logo will still be referenced directly via public path

export async function GET(req: NextRequest) {
  console.log(`[OG Image Gen ENTRY] Request received for URL: ${req.url}`); // Add entry log
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    // baseUrl no longer needed for font fetching
    // const baseUrl = url.origin;

    let from = 'Your Location';
    let to = 'Your Destination';

    // Check if the URL path is a route slug
    if (pathname.startsWith('/routes/')) {
      const routeSlug = pathname.replace('/routes/', '');
      const parts = routeSlug.split('-to-');
      if (parts.length === 2) {
        // Simple formatting: replace hyphens with spaces and capitalize words
        from = parts[0].replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        to = parts[1].replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    } else {
      // Fallback to getting 'from' and 'to' from query parameters
      const hasFrom = searchParams.has('from');
      const hasTo = searchParams.has('to');
      from = hasFrom && searchParams.get('from') ? searchParams.get('from')!.slice(0, 100) : from; // Limit length and ensure string
      to = hasTo && searchParams.get('to') ? searchParams.get('to')!.slice(0, 100) : to; // Limit length and ensure string
    }

    // Sanitize from/to strings to remove potentially problematic characters like parentheses
    const sanitizedFrom = from.replace(/[()]/g, '').trim();
    const sanitizedTo = to.replace(/[()]/g, '').trim();

    // Log the values being used for image generation
    console.log(`[OG Image Gen] Pathname: ${pathname}`); // Log pathname
    console.log(`[OG Image Gen] Parsed From: '${from}', Parsed To: '${to}'`); // Log parsed values
    console.log(`[OG Image Gen] Generating image for: From='${sanitizedFrom}', To='${sanitizedTo}' (Original: From='${from}', To='${to}')`);

    // Add logging for intermediate values
    // console.log(`[OG Image Gen Debug] Original From: '${from}', Original To: '${to}'`); // Redundant log
    console.log(`[OG Image Gen Debug] Sanitized From: '${sanitizedFrom}', Sanitized To: '${sanitizedTo}'`);


    // Removed local font file reading - will rely on @vercel/og fetching from Google Fonts

    // Use a static logo URL instead of reading from filesystem
    const logoUrl = 'https://www.bookshuttles.com/images/BookShuttles.com-Logo.png';


    // Generate the image using ImageResponse - Without border
    const imageResponse = new ImageResponse(
      (
        <div style={{
          background: 'white', // New background color
          color: '#004d3b', // Use green for text directly
          width: '1200px',
          height: '630px',
          display: 'flex', // Main container uses flex
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Inter Variable", sans-serif', // Use Google Font name
          padding: '20px', // Keep some padding
          textAlign: 'center', // Center text
          // Border removed as requested
          boxSizing: 'border-box', // Ensure padding/border are included in width/height
          }}>
          {/* Use static logo URL */}
          <img src={logoUrl} width={450} height={150} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" />
          {/* Route Text - Reverted size */}
          {/* Added display:flex to satisfy Satori */}
          {/* Removed fontWeight: 700 as bold font is not available */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 72, lineHeight: 1.2 }}>
            {/* Use sanitized values */}
            {sanitizedFrom} → {sanitizedTo}
          </div>
          {/* Tagline - Reverted size */}
           {/* Added display:flex to satisfy Satori */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 38, marginTop: 25, fontWeight: 500 }}>
            Shuttle Service · BookShuttles.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        // Removed fonts array - rely on automatic fetching from Google Fonts
        // Add proper caching headers
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
    // Directly return the ImageResponse
    return imageResponse;

  } catch (e: any) {
    console.error(`Failed to generate OG image: ${e.message}`);
    // Return the error message in the response for debugging
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
