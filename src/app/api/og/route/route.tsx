import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import React from 'react';
import fs from 'fs/promises';
import path from 'path';

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600;

// Use edge runtime for better performance
export const runtime = "edge";

// Timeout for image generation
const TIMEOUT_MS = 5000;

// Default fallback image URL
const FALLBACK_IMAGE_URL = 'https://www.bookshuttles.com/images/book_shuttles_logo_og_banner.png';

async function generateImage(from: string, to: string): Promise<ImageResponse> {
  try {
    // Generate image with minimal React component
    return new ImageResponse(
      (
        <div style={{
          background: 'white',
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#004d3b',
          textAlign: 'center',
        }}>
          <div style={{
            width: '450px',
            height: '150px',
            marginBottom: '30px',
            backgroundImage: `url(${FALLBACK_IMAGE_URL})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }} />
          <div style={{
            fontSize: '72px',
            lineHeight: 1.2,
            margin: 0,
            padding: 0,
          }}>
            {from} → {to}
          </div>
          <div style={{
            fontSize: '38px',
            marginTop: '25px',
            fontWeight: 500,
          }}>
            Shuttle Service · BookShuttles.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { pathname } = url;
    let from = 'Your Location';
    let to = 'Your Destination';

    // Parse route slug
    if (pathname.startsWith('/routes/')) {
      const routeSlug = pathname.replace('/routes/', '');
      const parts = routeSlug.split('-to-');
      if (parts.length === 2) {
        from = parts[0].replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        to = parts[1].replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Clean up text
    from = from.replace(/[()]/g, '').trim();
    to = to.replace(/[()]/g, '').trim();

    // Generate image with timeout
    const imagePromise = generateImage(from, to);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Image generation timed out')), TIMEOUT_MS);
    });

    const response = await Promise.race([imagePromise, timeoutPromise]);
    return response;

  } catch (error) {
    console.error('OG Image Error:', error);
    
    // Return fallback image
    return new Response(null, {
      status: 302,
      headers: {
        'Location': FALLBACK_IMAGE_URL,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }
}
