import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React

export const runtime = "edge";

// Function to fetch font data from public URL (Re-added)
async function getFontData(baseUrl: string) {
  const fontUrl = `${baseUrl}/fonts/Inter-Regular.otf`; // Path relative to public directory - using OTF
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch font (${response.status}): ${fontUrl}`);
    }
    return response.arrayBuffer();
  } catch (error) {
     console.error("Error fetching font:", error);
     throw new Error(`Could not get font data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Logo will still be referenced directly via public path

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    const baseUrl = url.origin; // Re-added baseUrl needed for font fetching

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

    // Fetch font data using the re-added function
    const fontData = await getFontData(baseUrl);

    // Logo will be referenced directly via public path

    // Define border style (variable kept for reference, but border removed)
    // const borderThickness = 20;
    const greenColor = '#004d3b';
    const textColor = greenColor; // Use green for text

    // Generate the image using ImageResponse
    const imageResponse = new ImageResponse(
      (
        <div style={{
          background: 'white', // New background color
          color: textColor, // New text color
          width: '1200px',
          height: '630px',
          display: 'flex', // Main container uses flex
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Inter", sans-serif', // Use the loaded font
          // padding removed
          textAlign: 'center', // Center text
          // border removed
          boxSizing: 'border-box', // Ensure padding/border are included in width/height
          }}>
          {/* Use relative path to public logo */}
          <img src="/images/BookShuttles.com-Logo.png" width={450} height={150} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" />
          {/* Route Text - Reverted size */}
          {/* Added display:flex to satisfy Satori */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 72, fontWeight: 700, lineHeight: 1.2 }}>
            {from} → {to}
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
        // Provide path to font file relative to project root (or use public URL)
        // Assuming the font is in public/fonts/
        // Note: @vercel/og might require the full URL in edge runtime if relative path fails
        fonts: [
          {
            name: 'Inter',
            data: fontData, // Use the fetched font data
            style: 'normal',
            weight: 400, // Specify weight if needed
          },
        ],
        // Removed explicit headers - rely on ImageResponse defaults
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
