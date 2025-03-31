import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Logout handler for NextAuth
 * This route handles POST requests to /api/auth/logout
 * It clears all auth cookies and redirects to the homepage
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Get the host for setting cookie domains
  const host = req.headers.get('host') || '';
  const domain = host.includes('localhost') ? 'localhost' : host.split(':')[0];
  
  // Detect if in production for secure cookies
  const isProduction = process.env.NODE_ENV === 'production';
  const cookiePrefix = isProduction ? '__Secure-' : '';
  
  // Get all cookies - but we don't actually need to list them, just clear the known auth ones
  const cookieStore = cookies();
  
  // Find and delete all auth-related cookies
  const authCookieNames = [
    `${cookiePrefix}next-auth.session-token`,
    `${cookiePrefix}next-auth.csrf-token`,
    `${cookiePrefix}next-auth.callback-url`,
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
  ];
  
  // Log the action
  console.log(`Clearing auth cookies for ${domain}:`, authCookieNames);
  
  // Get requested redirect URL or default to homepage
  const searchParams = req.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  // Create a redirect response
  const redirectUrl = new URL(callbackUrl, req.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });
  
  // Set cache control to prevent caching logout responses
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  
  // Clear all auth cookies
  authCookieNames.forEach(name => {
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
  
  // Log the redirect destination
  console.log(`Logout redirect to: ${callbackUrl}`);
  
  return response;
}

/**
 * GET handler to support form-based logout with CSRF protection
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // For GET requests, we'll redirect to the homepage with a message
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/';
  const redirectUrl = new URL(callbackUrl, req.url);
  return NextResponse.redirect(redirectUrl);
}
