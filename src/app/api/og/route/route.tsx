import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react'; // Explicitly import React
import fs from 'fs'; // Import Node.js fs module
import path from 'path'; // Import Node.js path module

// Removed edge runtime export - use default Node.js runtime
// export const runtime = "edge";

// Removed getFontData function - will read file directly

// Logo will still be referenced directly via public path

export async function GET(req: NextRequest) {
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
    console.log(`[OG Image Gen] Generating image for: From='${sanitizedFrom}', To='${sanitizedTo}' (Original: From='${from}', To='${to}')`);

    // Add logging for intermediate values
    console.log(`[OG Image Gen Debug] Original From: '${from}', Original To: '${to}'`);
    console.log(`[OG Image Gen Debug] Sanitized From: '${sanitizedFrom}', Sanitized To: '${sanitizedTo}'`);


    // Read font data directly from the filesystem
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.otf');
    let fontData: Buffer;
    try {
      fontData = fs.readFileSync(fontPath);
    } catch (error) {
      console.error("Error reading font file:", error);
      throw new Error(`Could not read font file: ${fontPath}`);
    }

    // Read logo data directly from the filesystem and create data URI
    const logoPath = path.join(process.cwd(), 'public', 'images', 'BookShuttles.com-Logo.png');
    let logoDataUri: string;
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64 = logoBuffer.toString('base64');
      logoDataUri = `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error("Error reading logo file:", error);
      // Fallback or decide how to handle - maybe use a placeholder or throw
      logoDataUri = ''; // Set to empty string if logo fails to load
      // Or: throw new Error(`Could not read logo file: ${logoPath}`);
    }


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
          fontFamily: '"Inter", sans-serif', // Use the loaded font
          padding: '20px', // Keep some padding
          textAlign: 'center', // Center text
          // Border removed as requested
          boxSizing: 'border-box', // Ensure padding/border are included in width/height
          }}>
          {/* Use logo data URI */}
          {logoDataUri ? (
            <img src={logoDataUri} width={450} height={150} style={{ marginBottom: 30 }} alt="BookShuttles.com Logo" />
          ) : (
            <div style={{ width: 450, height: 150, marginBottom: 30, border: '1px dashed grey', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'grey' }}>Logo Error</div>
          )}
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
        // Pass headers directly to ImageResponse constructor
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache', // Force no caching
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
