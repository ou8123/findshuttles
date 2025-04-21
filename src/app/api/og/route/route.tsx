import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React

export const runtime = "edge";

// Function to fetch font data
async function getFontData() {
  const fontUrl = 'https://rsms.me/inter/font-files/Inter-Regular.woff'; // Using WOFF format
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

// Relative path to the logo in the public directory
const LOGO_PATH = "/images/BookShuttles.com-Logo.png";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    // Construct absolute URL for the logo based on the request's origin
    const baseUrl = url.origin; // e.g., http://localhost:3000
    const absoluteLogoUrl = `${baseUrl}${LOGO_PATH}`;

    // Get 'from' and 'to' query parameters
    const hasFrom = searchParams.has('from');
    const hasTo = searchParams.has('to');
    const from = hasFrom ? searchParams.get('from')?.slice(0, 100) : 'Your Location'; // Limit length
    const to = hasTo ? searchParams.get('to')?.slice(0, 100) : 'Your Destination'; // Limit length

    // Fetch font data
    const fontData = await getFontData();

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
          fontFamily: '"Inter", sans-serif', // Use the loaded font
          padding: '40px',
          textAlign: 'center', // Center text
          }}>
          {/* Use the dynamically constructed absolute LOGO_URL */}
          <img src={absoluteLogoUrl} width={180} height={60} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" />
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
    // Return a plain text error response or a fallback image response
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
