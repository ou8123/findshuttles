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


    // Read font data directly from the filesystem
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.otf');
    let fontData: Buffer;
    try {
      fontData = fs.readFileSync(fontPath);
    } catch (error) {
      console.error("Error reading font file:", error);
      throw new Error(`Could not read font file: ${fontPath}`);
    }

    // Logo will be referenced directly via public path

    // Define border style (variable kept for reference, but border removed)
    // const borderThickness = 20;
    const greenColor = '#004d3b';
    const textColor = greenColor; // Use green for text

    // Generate the image using ImageResponse - TEMPORARILY SIMPLIFIED
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            fontSize: 60,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column', // Stack items vertically
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Inter", sans-serif',
            color: 'black', // Simple text color
          }}
        >
          {/* Display only sanitized From/To */}
          <div>{sanitizedFrom}</div>
          <div>→</div>
          <div>{sanitizedTo}</div>
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
    // Create a new Response with the image body and explicit headers (Re-added)
    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Optional: Add cache control headers if desired
        // 'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (e: any) {
    console.error(`Failed to generate OG image: ${e.message}`);
    // Return the error message in the response for debugging
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
