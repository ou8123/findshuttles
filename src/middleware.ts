import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { SYSTEM_AUTH_COOKIE, verifyToken } from '@/lib/system-auth';
import { getSession } from '@/lib/auth0-config';
// No need to import netlify-identity-widget as it's client-side only

// Define a simple in-memory store for rate limiting 
// In production, you'd use Redis or another distributed store
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  }
}

// Rate limiting configuration
const RATE_LIMIT_MAX = 10; // Maximum requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

// In-memory store - will reset on server restart
// For production, use Redis or a database
const rateLimitStore: RateLimitStore = {};

// Define secure path tokens
// Using fixed strings instead of random to avoid path changes on restart
// In production, these should be in environment variables
const ADMIN_PATH_TOKEN = 'management-portal-8f7d3e2a1c';
const LOGIN_PATH_TOKEN = 'secure-access-9b1c3f5d7e'; 
const SYSTEM_ACCESS_PATH = 'system-access'; // Direct management access path

// Convert from /admin/* to /{ADMIN_PATH_TOKEN}/*
export function getSecureAdminPath(path: string): string {
  return path.replace(/^\/admin\b/, `/${ADMIN_PATH_TOKEN}`);
}

// Convert from /{ADMIN_PATH_TOKEN}/* to /admin/*
export function getInternalAdminPath(path: string): string {
  return path.replace(new RegExp(`^\\/${ADMIN_PATH_TOKEN}\\b`), '/admin');
}

// Convert from /login to /{LOGIN_PATH_TOKEN}
export function getSecureLoginPath(path: string): string {
  return path.replace(/^\/login\b/, `/${LOGIN_PATH_TOKEN}`);
}

// Convert from /{LOGIN_PATH_TOKEN} to /login
export function getInternalLoginPath(path: string): string {
  return path.replace(new RegExp(`^\\/${LOGIN_PATH_TOKEN}\\b`), '/login');
}

// Check if path is an admin path (either secure or internal)
export function isAdminPath(path: string): boolean {
  return path.startsWith('/admin') || path.startsWith(`/${ADMIN_PATH_TOKEN}`);
}

// Check if path is a system access path (our new direct auth route)
export function isSystemAccessPath(path: string): boolean {
  return path.startsWith(`/${SYSTEM_ACCESS_PATH}`);
}

// Check if path is a login path (either secure or internal)
export function isLoginPath(path: string): boolean {
  return path.startsWith('/login') || path.startsWith(`/${LOGIN_PATH_TOKEN}`);
}

// Perform rate limiting
function rateLimit(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now();
  
  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
  
  // Initialize or get existing data
  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    };
  }
  
  // Increment and check
  rateLimitStore[ip].count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - rateLimitStore[ip].count);
  
  return { 
    limited: rateLimitStore[ip].count > RATE_LIMIT_MAX,
    remaining
  };
}

// Add security headers to all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Restrict MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable Cross-Site Scripting filter
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent caching of authenticated routes
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  
  return response;
}

// The middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Get IP from headers - more reliable across Next.js versions
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  let response: NextResponse | undefined;
  
  // Check if this is a login/auth API request
  const isAuthRequest = pathname.startsWith('/api/auth/');
  
  // Apply rate limiting on auth endpoints
  if (isAuthRequest && request.method === 'POST') {
    const { limited, remaining } = rateLimit(ip);
    
    if (limited) {
      response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', '60');
      return addSecurityHeaders(response);
    }
    
    // Continue, but add rate limit headers
    response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    return addSecurityHeaders(response);
  }
  
  // Handle login page security
  if (isLoginPath(pathname)) {
    // If they used the internal path (/login), redirect to the secure path
    if (pathname.startsWith('/login')) {
      const securePath = getSecureLoginPath(pathname);
      const url = new URL(securePath, request.url);
      // Copy all search params
      request.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      return NextResponse.redirect(url);
    }
    
    // They used the correct secure path, rewrite internally to the login path
    const url = request.nextUrl.clone();
    url.pathname = getInternalLoginPath(pathname);
    response = NextResponse.rewrite(url);
    return addSecurityHeaders(response);
  }
  
  // Skip middleware for system access path and Auth0 api routes to allow direct access
  if (isSystemAccessPath(pathname) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Check for admin routes - both the real internal path and the obscured path
  if (isAdminPath(pathname)) {
    // Authentication check strategy:
    // 1. Try Auth0 session first (primary method)
    // 2. Try system auth token (reliable backup method)
    // 3. Fall back to direct-admin-auth token (emergency bypass)
    // 4. Finally try NextAuth token (legacy support)
    let isAuthenticated = false;
    
    // 1. Check for Auth0 session
    if (!isAuthenticated) {
      try {
        const session = await getSession(request as any);
        if (session?.user) {
          // Check if user has admin role or is admin email
          const isAdmin = 
            session.user.role === 'ADMIN' || 
            session.user.email === 'aiaffiliatecom@gmail.com';
          
          if (isAdmin) {
            isAuthenticated = true;
            console.log('Admin authenticated using Auth0');
          }
        }
      } catch (error) {
        console.error('Error with Auth0 session:', error);
        // Continue to other auth methods if Auth0 fails
      }
    }
    
    // 2. If not authenticated, check system auth token
    if (!isAuthenticated) {
      const systemAuthToken = request.cookies.get(SYSTEM_AUTH_COOKIE);
      if (systemAuthToken) {
        try {
          // Verify the token using our utility
          const user = verifyToken(systemAuthToken.value);
          
          if (user && user.role === 'ADMIN') {
            isAuthenticated = true;
            console.log('Admin authenticated using system auth token');
          }
        } catch (error) {
          console.error('Error verifying system auth token:', error);
          // Continue to try other auth methods if system auth fails
        }
      }
    }
    
    // 3. If still not authenticated, check direct auth token (emergency bypass)
    if (!isAuthenticated) {
      const directAuthToken = request.cookies.get('direct-admin-auth');
      if (directAuthToken) {
        try {
          // Verify the token using our secret
          const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-netlify-testing-only';
          const decoded = jwt.verify(directAuthToken.value, secret);
          
          // Check if token has admin role
          if (decoded && typeof decoded === 'object' && decoded.role === 'ADMIN') {
            isAuthenticated = true;
            console.log('Admin authenticated using direct auth token');
          }
        } catch (error) {
          console.error('Error verifying direct auth token:', error);
          // Continue to try NextAuth token if direct auth fails
        }
      }
    }
    
    // 4. If still not authenticated, try NextAuth token (legacy)
    if (!isAuthenticated) {
      try {
        // Enhanced token retrieval with Netlify-specific options
        // Use production cookie name based on environment
        const isProduction = process.env.NODE_ENV === 'production';
        const cookiePrefix = isProduction ? '__Secure-' : '';
        const cookieName = `${cookiePrefix}next-auth.session-token`;
        
        // Get token with enhanced options
        const token = await getToken({ 
          req: request,
          // These options make token verification more resilient on Netlify
          secureCookie: isProduction,
          cookieName: cookieName,
          secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-netlify-testing-only',
        });
        
        // Enhanced logging for debugging
        console.log(`Middleware auth check for ${pathname}:`, {
          authMethod: 'NextAuth',
          hasToken: !!token,
          tokenRole: token?.role,
          cookieName: cookieName,
          allCookies: request.cookies.getAll().map(c => c.name),
          host: request.headers.get('host'),
          referer: request.headers.get('referer'),
          isProduction: isProduction,
        });
        
        // Check if user is admin via NextAuth token
        isAuthenticated = token?.role === 'ADMIN';
        
        // Special case - if token exists but role is wrong, log it
        if (token && !isAuthenticated) {
          console.log(`Token found but not admin role: ${token.role}`);
        }
      } catch (error) {
        console.error('Error verifying auth token in middleware:', error);
      }
    }
    
    // Not authenticated or not an admin through either method
    if (!isAuthenticated) {
      // Add debug cookie to track redirect reason and redirect to debug page
      const debugUrl = new URL('/admin-debug', request.url);
      debugUrl.searchParams.set('from', 'auth-failure');
      
      const response = NextResponse.redirect(debugUrl);
      response.cookies.set('auth-debug-redirect', 'failed-admin-auth', {
        httpOnly: true,
        maxAge: 60 * 5, // 5 minutes
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      // Add security headers
      return addSecurityHeaders(response);
    }
    
    // User is authenticated as admin
    
    // If they used the internal path (/admin), redirect to the secure path
    if (pathname.startsWith('/admin')) {
      const securePath = getSecureAdminPath(pathname);
      const url = new URL(securePath, request.url);
      // Copy all search params
      request.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      return NextResponse.redirect(url);
    }
    
    // They used the correct secure path, rewrite internally to the admin path
    const url = request.nextUrl.clone();
    url.pathname = getInternalAdminPath(pathname);
    response = NextResponse.rewrite(url);
    return addSecurityHeaders(response);
  }
  
  // Apply security headers to all responses
  return addSecurityHeaders(NextResponse.next());
}

// Apply this middleware to all routes
export const config = {
  matcher: [
    // Apply to all routes except static files, images, and other assets
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
