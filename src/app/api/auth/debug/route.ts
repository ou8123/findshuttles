// src/app/api/auth/debug/route.ts
import { NextResponse } from 'next/server';
import { getNetlifyDebugSession } from '@/lib/netlify-auth-debug';
import { cookies } from 'next/headers';

/**
 * Enhanced debug endpoint for troubleshooting authentication issues
 * - Provides detailed session and cookie diagnostics
 * - Helps identify JWT and cookie persistence issues on Netlify
 */
export async function GET() {
  try {
    // Get detailed session information
    const debugInfo = await getNetlifyDebugSession();

    // Add version info to help track issues
    const appInfo = {
      version: '1.0.2', // Increment this when making significant auth changes
      debugTimestamp: new Date().toISOString(),
      lastAuthUpdate: '2025-03-30', // Update this when changing auth code
    };
    
    // Merge information
    const combinedInfo = {
      ...debugInfo,
      appInfo
    };
    
    // Always send the debug info regardless of authentication status
    // This is crucial for diagnosing auth problems
    
    // Set a debug cookie to track debug requests
    const headers = new Headers({
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    });
    
    const response = NextResponse.json(combinedInfo, { headers });
    
    // Add a temporary debug marker cookie
    response.cookies.set('auth-debug-accessed', 'true', {
      httpOnly: true,
      maxAge: 60 * 5, // 5 minutes
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    return response;
  } catch (error) {
    // Even on error, return as much information as possible to help debug
    console.error('Auth debug endpoint error:', error);
    
    // Safely get cookie info with type assertions
    let cookieInfo = { count: 0, names: [] };
    try {
      const cookieStore = cookies() as any;
      const allCookies = cookieStore.getAll ? cookieStore.getAll() : [];
      cookieInfo = {
        count: allCookies.length,
        names: allCookies.map((c: any) => c.name)
      };
    } catch (cookieError) {
      console.error('Error getting cookies in error handler:', cookieError);
    }
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      note: 'Error occurred while gathering auth debug info',
      cookies: cookieInfo
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

/**
 * Allow POST requests for more detailed debugging operations
 * This can be used to test setting cookies and other auth operations
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    // Basic actions for testing auth
    if (action === 'test-cookie') {
      const response = NextResponse.json({
        success: true,
        action: 'test-cookie',
        timestamp: new Date().toISOString(),
      });
      
      // Set a test cookie to verify cookie setting works
      response.cookies.set('auth-test-cookie', 'test-value', {
        httpOnly: true,
        maxAge: 60 * 5, // 5 minutes
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      
      return response;
    }
    
    return NextResponse.json({
      error: 'Invalid or unsupported action',
      supportedActions: ['test-cookie']
    }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Error processing debug request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
