import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React
// Removed fs/promises and path imports as they are not available in edge runtime
// Removed font and logo fetching functions for debugging

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;
    const baseUrl = url.origin; // e.g., http://localhost:3000 or https://bookshuttles.com

    // Get 'from' and 'to' query parameters
    const hasFrom = searchParams.has('from');
    const hasTo = searchParams.has('to');
    const from = hasFrom ? searchParams.get('from')?.slice(0, 100) : 'Your Location'; // Limit length
    const to = hasTo ? searchParams.get('to')?.slice(0, 100) : 'Your Destination'; // Limit length

    // Removed font and logo fetching for debugging
    // const [fontData, logoDataUri] = await Promise.all([
    //   getFontData(baseUrl), // Pass baseUrl here
    //   getLogoDataUri(baseUrl) // Pass baseUrl here
    // ]);

    return new ImageResponse(
      (
        <div style={{
          background: '#004d3b', // Your brand background color
          color: 'white',
          width: '1200px',
          height: '630px',
          display: 'flex', // Main container uses flex
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif', // Use basic system font for debugging
          padding: '40px',
          textAlign: 'center', // Center text
          }}>
          {/* Removed logo for debugging */}
          {/* <img src={logoDataUri} width={180} height={60} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" /> */}
          {/* Route Text */}
          {/* Added display:flex to satisfy Satori */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 60, fontWeight: 700, lineHeight: 1.2 }}>
            {from} → {to}
          </div>
          {/* Tagline */}
           {/* Added display:flex to satisfy Satori */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 32, marginTop: 25, fontWeight: 500 }}>
            Shuttle Service · BookShuttles.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        // Removed fonts option for debugging
        // fonts: [
        //   {
        //     name: 'Inter',
        //     data: fontData, // Use the fetched font data
        //     style: 'normal',
        //     weight: 400, // Specify weight if needed
        //   },
        // ],
      }
    );
  } catch (e: any) {
    console.error(`Failed to generate OG image: ${e.message}`);
    // Return a plain text error response or a fallback image response
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
