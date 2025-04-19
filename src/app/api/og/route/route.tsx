import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React

export const config = {
  runtime: 'edge',
};

// Note: Using a placeholder logo URL. Replace with your actual logo URL.
const LOGO_URL = "https://www.bookshuttles.com/images/BookShuttles.com-Logo.png"; // Replace if needed

export default function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Get 'from' and 'to' query parameters
    const hasFrom = searchParams.has('from');
    const hasTo = searchParams.has('to');
    const from = hasFrom ? searchParams.get('from')?.slice(0, 100) : 'Your Location'; // Limit length
    const to = hasTo ? searchParams.get('to')?.slice(0, 100) : 'Your Destination'; // Limit length

    return new ImageResponse(
      (
        <div style={{
          background: '#004d3b', // Your brand background color
          color: 'white',
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Arial", sans-serif', // Ensure font is available in edge runtime or use web safe font
          padding: '40px',
          textAlign: 'center', // Center text
        }}>
          {/* Use the LOGO_URL defined above */}
          <img src={LOGO_URL} width={180} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" />
          {/* Route Text */}
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.2 }}> {/* Increased font size */}
            {from} → {to}
          </div>
          {/* Tagline */}
          <div style={{ fontSize: 32, marginTop: 25, fontWeight: 500 }}> {/* Increased font size */}
            Shuttle Service · BookShuttles.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        // You might need to configure fonts if using custom ones
        // fonts: [
        //   {
        //     name: 'YourFontName',
        //     data: fontData, // Load font data
        //     style: 'normal',
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
