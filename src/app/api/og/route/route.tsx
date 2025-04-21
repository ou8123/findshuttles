import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React
// Removed fs/promises and path imports as they are not available in edge runtime

export const runtime = "edge";

// Function to fetch font data from public URL
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

// Function to fetch logo and convert to Data URI
async function getLogoDataUri(baseUrl: string): Promise<string> {
  const logoPath = "/images/BookShuttles.com-Logo.png";
  const absoluteLogoUrl = `${baseUrl}${logoPath}`;
  try {
    const response = await fetch(absoluteLogoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo (${response.status}): ${absoluteLogoUrl}`);
    }
    const contentType = response.headers.get('content-type') || 'image/png'; // Default to png
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching logo:", error);
    // Fallback or re-throw, depending on desired behavior
    // Returning an empty string or a placeholder might be options
    // For now, re-throwing to make the failure explicit
    throw new Error(`Could not get logo data URI: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    const baseUrl = url.origin; // e.g., http://localhost:3000 or https://bookshuttles.com

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


    // Fetch font data and logo data URI concurrently
    const [fontData, logoDataUri] = await Promise.all([
      getFontData(baseUrl), // Pass baseUrl here
      getLogoDataUri(baseUrl) // Pass baseUrl here
    ]);

    // Define border style
    const borderThickness = 20; // Adjust thickness as needed
    const greenColor = '#004d3b';
    const textColor = greenColor; // Use green for text

    return new ImageResponse(
      (
        <div style={{
          background: 'white', // New background color
          color: textColor, // New text color
          width: '600px',
          height: '315px',
          display: 'flex', // Main container uses flex
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Inter", sans-serif', // Use the loaded font
          padding: `10px`, // Reduced padding
          textAlign: 'center', // Center text
          boxSizing: 'border-box', // Ensure padding/border are included in width/height
          }}>
          {/* Use the logo Data URI - Adjusted size */}
          {/* <img src={logoDataUri} width={225} height={75} style={{ marginBottom: 15 }} alt="BookShuttles.com Logo" /> */}
          {/* Route Text - Reduced size */}
          {/* Added display:flex to satisfy Satori */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>
            {from} → {to}
          </div>
          {/* Tagline - Reduced size */}
           {/* Added display:flex to satisfy Satori */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 19, marginTop: 12, fontWeight: 500 }}>
            Shuttle Service · BookShuttles.com
          </div>
        </div>
      ),
      {
        width: 600,
        height: 315,
        fonts: [
          {
            name: 'Inter',
            data: fontData, // Use the fetched font data
            style: 'normal',
            weight: 400, // Specify weight if needed
          },
        ],
      }
    );
  } catch (e: any) {
    console.error(`Failed to generate OG image: ${e.message}`);
    // Return the error message in the response for debugging
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
