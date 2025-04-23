import { NextResponse, type NextRequest } from 'next/server';
// import { getToken } from 'next-auth/jwt'; // Commented out for debugging

// Define a simple in-memory store for rate limiting
// In production, you'd use Redis or another distributed store
// interface RateLimitStore {
//   [key: string]: {
//     count: number;
//     resetAt: number;
//   }
// }

// Rate limiting configuration
// const RATE_LIMIT_MAX = 10; // Maximum requests per window
// const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

// In-memory store - will reset on server restart
// For production, use Redis or a database
// const rateLimitStore: RateLimitStore = {};

// Define secure path tokens
// Using fixed strings instead of random to avoid path changes on restart
// In production, these should be in environment variables
const ADMIN_PATH_TOKEN = 'management-portal-8f7d3e2a1c';
const LOGIN_PATH_TOKEN = 'secure-access-9b1c3f5d7e';

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

// Check if path is a login path (either secure or internal)
export function isLoginPath(path: string): boolean {
  return path.startsWith('/login') || path.startsWith(`/${LOGIN_PATH_TOKEN}`);
}

// Perform rate limiting
// function rateLimit(ip: string): { limited: boolean; remaining: number } {
//   const now = Date.now();
//
//   // Clean up expired entries
//   Object.keys(rateLimitStore).forEach(key => {
//     if (rateLimitStore[key].resetAt < now) {
//       delete rateLimitStore[key];
//     }
//   });
//
//   // Initialize or get existing data
//   if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
//     rateLimitStore[ip] = {
//       count: 0,
//       resetAt: now + RATE_LIMIT_WINDOW_MS
//     };
//   }
//
//   // Increment and check
//   rateLimitStore[ip].count++;
//   const remaining = Math.max(0, RATE_LIMIT_MAX - rateLimitStore[ip].count);
//
//   return {
//     limited: rateLimitStore[ip].count > RATE_LIMIT_MAX,
//     remaining
//   };
// }

// Add security headers to all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Restrict MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable Cross-Site Scripting filter
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Prevent caching of authenticated routes (Keep this? Maybe comment out if causing issues)
  // response.headers.set('Cache-Control', 'no-store, max-age=0');

  return response;
}

// Create a 404 Not Found response
// function create404Response(): NextResponse {
//   const response = NextResponse.json(
//     { error: 'Not Found' },
//     { status: 404 }
//   );
//   return addSecurityHeaders(response);
// }

// The middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get('user-agent') || ''; // Get User Agent

  // --- BEGIN Scraper Detection & Rewrite ---
  const isCrawler =
    ua.includes('facebookexternalhit') ||
    ua.includes('Twitterbot') ||
    ua.includes('WhatsApp') ||
    ua.includes('Slackbot-LinkExpanding') ||
    ua.includes('LinkedInBot');

  const isRoutePage = pathname.startsWith('/routes/');

  if (isCrawler && isRoutePage) {
    console.log(`[Middleware] Detected crawler (${ua}) on route page (${pathname}). Redirecting to /og-lite.html`);
    const staticOGUrl = new URL('/og-lite.html', request.url);
    // Use a 307 Temporary Redirect instead of rewrite
    return NextResponse.redirect(staticOGUrl, 307);
  }
  // --- END Scraper Detection & Rewrite ---


  // --- Temporarily Commented Out All Other Logic ---

  // Get IP from headers - more reliable across Next.js versions
  // const ip = request.headers.get('x-forwarded-for') ||
  //            request.headers.get('x-real-ip') ||
  //            'unknown';
  // let response: NextResponse | undefined;

  // Check if this is a login/auth API request
  // const isAuthRequest = pathname.startsWith('/api/auth/');

  // Apply rate limiting on auth endpoints
  // if (isAuthRequest && request.method === 'POST') {
  //   const { limited, remaining } = rateLimit(ip);
  //
  //   if (limited) {
  //     response = NextResponse.json(
  //       { error: 'Too many requests. Please try again later.' },
  //       { status: 429 }
  //     );
  //     response.headers.set('Retry-After', '60');
  //     return addSecurityHeaders(response);
  //   }
  //
  //   // Continue, but add rate limit headers
  //   response = NextResponse.next();
  //   response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
  //   response.headers.set('X-RateLimit-Remaining', remaining.toString());
  //   return addSecurityHeaders(response);
  // }

  // Handle login page security
  // if (isLoginPath(pathname)) {
  //   // If they used the standard /login path, return a 404 to hide its existence
  //   if (pathname.startsWith('/login')) {
  //     return create404Response();
  //   }
  //
  //   // If they used the obscured path, rewrite to the internal login path
  //   if (pathname.startsWith(`/${LOGIN_PATH_TOKEN}`)) {
  //     const url = request.nextUrl.clone();
  //     url.pathname = getInternalLoginPath(pathname);
  //     response = NextResponse.rewrite(url);
  //     return addSecurityHeaders(response);
  //   }
  // }

// Skip middleware for all auth-related API routes to prevent interference with NextAuth
// if (pathname.startsWith('/api/auth/') ||
//     pathname.includes('auth0') ||
//     pathname.includes('nextauth') ||
//     pathname.includes('system-auth')) {
//   // Add debug for auth route handling
//   console.log(`Middleware bypassed for auth route: ${pathname}`);
//   return NextResponse.next();
// }

// Skip middleware for API routes that need direct access
// if (pathname.startsWith('/api/admin/') || // Add bypass for all admin APIs
//     pathname.startsWith('/api/locations') ||
//     pathname.startsWith('/api/routes') ||
//     pathname.startsWith('/api/valid-destinations') ||
//     pathname.startsWith('/api/og/')) { // Bypass OG image route
//   console.log(`Middleware bypassed for API route: ${pathname}`);
//   return NextResponse.next();
// }

// Special handling for auth error routes
// if (pathname === '/api/auth/error') {
//   // Redirect to the stealth login path with error parameter, ensuring production domain
//   const productionDomain = 'https://www.bookshuttles.com';
//   const url = new URL(`/${LOGIN_PATH_TOKEN}`, productionDomain); // Use production domain as base
//   url.searchParams.set('error', 'AuthError');
//   return addSecurityHeaders(NextResponse.redirect(url));
// }

  // Check for admin routes - both the real internal path and the obscured path
  // if (isAdminPath(pathname)) {
  //   // If they used the standard /admin path (but NOT /api/admin), return a 404 to hide its existence
  //   if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
  //     console.log(`Middleware blocking direct access to internal admin page: ${pathname}`);
  //     return create404Response();
  //   }
  //
  //   // Authentication check using NextAuth - only for stealth admin paths
  //   if (pathname.startsWith(`/${ADMIN_PATH_TOKEN}`)) {
  //     let isAuthenticated = false;
  //
  //     try {
  //       // Enhanced token retrieval with options
  //       const isProduction = process.env.NODE_ENV === 'production';
  //       const cookiePrefix = isProduction ? '__Secure-' : '';
  //       const cookieName = `${cookiePrefix}next-auth.session-token`;
  //
  //       // Get token with enhanced options
  //       const token = await getToken({
  //         req: request,
  //         secureCookie: isProduction,
  //         cookieName: cookieName,
  //         secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-netlify-testing-only',
  //       });
  //
  //       // Enhanced logging for debugging
  //       console.log(`Middleware auth check for ${pathname}:`, {
  //         authMethod: 'NextAuth',
  //         hasToken: !!token,
  //         tokenRole: token?.role,
  //         cookieName: cookieName,
  //         allCookies: request.cookies.getAll().map(c => c.name),
  //         host: request.headers.get('host'),
  //         referer: request.headers.get('referer'),
  //         isProduction: isProduction,
  //       });
  //
  //       // Check if user is admin via NextAuth token
  //       isAuthenticated = token?.role === 'ADMIN';
  //
  //       // Special case - if token exists but role is wrong, log it
  //       if (token && !isAuthenticated) {
  //         console.log(`Token found but not admin role: ${token.role}`);
  //       }
  //     } catch (error) {
  //       console.error('Error verifying auth token in middleware:', error);
  //     }
  //
  //     // Not authenticated or not an admin
  //     if (!isAuthenticated) {
  //       // Redirect to stealth login path, ensuring production domain
  //       const productionDomain = 'https://www.bookshuttles.com';
  //       const loginUrl = new URL(`/${LOGIN_PATH_TOKEN}`, productionDomain); // Use production domain as base
  //       // Use the original request URL for the callback, but ensure it's HTTPS
  //       const callbackUrl = new URL(request.url);
  //       callbackUrl.protocol = 'https:'; // Ensure callback uses https
  //       loginUrl.searchParams.set('callbackUrl', callbackUrl.toString());
  //
  //       return NextResponse.redirect(loginUrl);
  //     }
  //
  //     // If authenticated, rewrite the stealth path to the internal admin path
  //     const url = request.nextUrl.clone();
  //     url.pathname = getInternalAdminPath(pathname);
  //     response = NextResponse.rewrite(url);
  //     return addSecurityHeaders(response);
  //   }
  // }

  // --- END Temporarily Commented Out Logic ---


  // Apply security headers to all *other* responses that pass through
  return addSecurityHeaders(NextResponse.next());
}

// Apply this middleware to all routes
export const config = {
  matcher: [
    // Apply to all routes except static files, images, and other assets
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
