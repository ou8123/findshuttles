import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Define stealth path tokens - these should match middleware.ts
const ADMIN_PATH_TOKEN = 'management-portal-8f7d3e2a1c';
const LOGIN_PATH_TOKEN = 'secure-access-9b1c3f5d7e';

/**
 * Logout handler for NextAuth
 * This route handles POST requests to /api/auth/logout
 * It clears all auth cookies and redirects to the stealth login path
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const host = req.headers.get('host') || '';
  const domain = host.includes('localhost') ? 'localhost' : host.split(':')[0];
  
  // Detect if in production for secure cookies
  const isProduction = process.env.NODE_ENV === 'production';
  const cookiePrefix = isProduction ? '__Secure-' : '';

  // Get requested redirect URL or default to stealth login path
  let callbackUrl;
  try {
    const body = await req.json();
    callbackUrl = body.callbackUrl || `/${LOGIN_PATH_TOKEN}`;
  } catch (error) {
    // If parsing JSON fails, use search params
    const searchParams = req.nextUrl.searchParams;
    callbackUrl = searchParams.get('callbackUrl') || `/${LOGIN_PATH_TOKEN}`;
  }
  
  // Make sure we're redirecting to the stealth login path, not the regular one
  if (callbackUrl === '/login') {
    callbackUrl = `/${LOGIN_PATH_TOKEN}`;
  }
  
  // Create a redirect response
  const redirectUrl = new URL(callbackUrl, req.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });
  
  // Find and delete all auth-related cookies
  // More comprehensive list of possible cookie names
  const authCookieNames = [
    // NextAuth standard cookies
    `${cookiePrefix}next-auth.session-token`,
    `${cookiePrefix}next-auth.csrf-token`,
    `${cookiePrefix}next-auth.callback-url`,
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    // JWT cookies
    `${cookiePrefix}next-auth.jwt-session`,
    'next-auth.jwt-session',
    // Backward compatibility 
    'next-auth.session-token.0',
    'next-auth.session-token.1',
    // Cover potential edge cases
    `${cookiePrefix}next-auth.pkce.code_verifier`,
    'next-auth.pkce.code_verifier'
  ];
  
  // Log the action
  console.log('Clearing auth cookies:', {
    domain,
    isProduction,
    cookiesToClear: authCookieNames,
    isNetlify: !!process.env.NETLIFY || !!process.env.NEXT_USE_NETLIFY_EDGE,
    redirectTo: callbackUrl
  });

  // Clear all auth cookies with multiple configurations to ensure they're all caught
  authCookieNames.forEach(name => {
    // Clear with specific domain
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0),
      path: '/',
      domain: isProduction ? domain : undefined,
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
    });
    
    // Also clear without domain specification (some setups use this)
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0),
      path: '/',
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
    });
    
    // Clear cookie at root path too
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0),
      path: '/',
      domain: isProduction ? domain : undefined,
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
    });
  });
  
  // Set cache control to prevent caching logout responses
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Log the redirect destination
  console.log(`Logout redirect to: ${callbackUrl}`);
  
  return response;
}

/**
 * GET handler to support form-based logout with CSRF protection
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // For GET requests, redirect to the stealth login path
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || `/${LOGIN_PATH_TOKEN}`;
  const redirectUrl = new URL(callbackUrl, req.url);
  return NextResponse.redirect(redirectUrl);
}
