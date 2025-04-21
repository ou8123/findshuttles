import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React
import { readFile } from 'fs/promises'; // Import readFile
import path from 'path'; // Import path

export const runtime = "edge";

// Function to load local font data
async function getFontData() {
  // Construct the absolute path to the font file relative to the current file
  // Note: This assumes the built output structure maintains this relative path.
  // Adjust if your build process changes file locations significantly.
  const fontPath = path.join(process.cwd(), 'src/app/api/og/fonts/Inter-Regular.woff2'); // Updated filename
  try {
    const fontData = await readFile(fontPath);
    return fontData;
  } catch (error) {
    console.error(`Error reading font file at ${fontPath}:`, error);
    throw new Error(`Could not load font file: ${error instanceof Error ? error.message : String(error)}`);
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
    const { searchParams } = url;
    const baseUrl = url.origin; // e.g., http://localhost:3000 or https://bookshuttles.com

    // Get 'from' and 'to' query parameters
    const hasFrom = searchParams.has('from');
    const hasTo = searchParams.has('to');
    const from = hasFrom ? searchParams.get('from')?.slice(0, 100) : 'Your Location'; // Limit length
    const to = hasTo ? searchParams.get('to')?.slice(0, 100) : 'Your Destination'; // Limit length

    // Fetch font data and logo data URI concurrently
    const [fontData, logoDataUri] = await Promise.all([
      getFontData(),
      getLogoDataUri(baseUrl) // Pass baseUrl here
    ]);

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
          {/* Use the logo Data URI */}
          <img src={logoDataUri} width={180} height={60} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" />
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
