// src/lib/netlify-auth-debug.ts
// Debug helper for NextAuth on Netlify
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";

/**
 * Enhanced debug function to check authentication status on Netlify
 * 
 * This can be imported in API routes and server components to get
 * detailed information about the current session state
 */
export async function getNetlifyDebugSession() {
  try {
    // Try to get the session
    const session = await getServerSession(authOptions);
    
    // Get environment info
    const isProduction = process.env.NODE_ENV === 'production';
    const isNetlify = !!process.env.NETLIFY || !!process.env.NEXT_USE_NETLIFY_EDGE;
    const cookiePrefix = isProduction ? '__Secure-' : '';
    const cookieName = `${cookiePrefix}next-auth.session-token`;
    
    // Default values
    let host = 'unknown';
    let userAgent = 'unknown';
    let referer = 'none';
    let headerInfo: Record<string, string> = {};
    let cookieNames: string[] = [];
    let cookieValues: Record<string, string> = {};
    let hasSessionToken = false;
    let hasDirectAuth = false;
    let hasNextAuth = false;
    let hasSecureCookie = false;
    let hasExpectedCookie = false;
    
    // Safe header access
    try {
      // TypeScript is having issues with the headers() API, use type assertions
      const headersData = headers() as any;
      const headerEntries = [...headersData.entries()]; 
      
      // Extract common headers we care about
      const headersObj: Record<string, string> = {};
      for (const [key, value] of headerEntries) {
        headersObj[key.toLowerCase()] = value;
      }
      
      // Get specific headers
      host = headersObj['host'] || 'unknown';
      userAgent = headersObj['user-agent'] || 'unknown';
      referer = headersObj['referer'] || 'none';
      
      // Build header info for debug, redacting sensitive info
      for (const [key, value] of headerEntries) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'authorization' || lowerKey === 'cookie') {
          headerInfo[key] = '[REDACTED]';
        } else {
          headerInfo[key] = value;
        }
      }
    } catch (headerError) {
      console.warn('Error accessing headers:', headerError);
    }
    
    // Safe cookie access
    try {
      // TypeScript is having issues with the cookies() API, use type assertions
      const cookieStore = cookies() as any;
      const allCookies = cookieStore.getAll ? cookieStore.getAll() : [];
      
      // Process cookie data
      for (const cookie of allCookies) {
        cookieNames.push(cookie.name);
        // Only show first 20 chars of value for security
        cookieValues[cookie.name] = cookie.value.substring(0, 20) + 
          (cookie.value.length > 20 ? '...' : '');
      }
      
      // Check for auth cookies
      hasSessionToken = cookieNames.some(name => name.includes('session-token'));
      hasNextAuth = cookieNames.some(name => name.includes('next-auth'));
      hasDirectAuth = cookieNames.includes('direct-admin-auth');
      hasSecureCookie = cookieNames.some(name => 
        name.startsWith('__Secure-') || name.startsWith('__Host-')
      );
      
      // Check specific cookie we expect
      hasExpectedCookie = cookieNames.includes(cookieName);
      
      console.log(`Auth debug - Looking for cookie: ${cookieName}, found: ${hasExpectedCookie}`);
    } catch (cookieError) {
      console.warn('Error accessing cookies:', cookieError);
    }

    // Try to get raw JWT token with error handling
    let jwtInfo: any = { exists: false };
    try {
      // Create a compatible request object for getToken
      const req = {
        headers: headerInfo,
        cookies: cookieValues
      };
      
      // Get raw token directly using NextAuth JWT methods
      const token = await getToken({
        req: req as any,
        secret: authOptions.secret,
      });
      
      if (token) {
        jwtInfo = {
          exists: true,
          role: token.role,
          email: token.email,
          // Convert epoch seconds to milliseconds for Date constructor if it's a number
          expires: token.exp ? 
            new Date(typeof token.exp === 'number' ? token.exp * 1000 : 0).toISOString() : 
            'unknown',
        };
      }
    } catch (jwtError) {
      jwtInfo = { error: String(jwtError) };
    }

    return {
      authenticated: !!session?.user,
      user: session?.user,
      session: session,
      cookieInfo: {
        count: cookieNames.length,
        names: cookieNames,
        values: cookieValues,
        hasSessionToken,
        hasNextAuth,
        hasDirectAuth,
        hasSecureCookie,
        expectedCookieName: cookieName,
        hasExpectedCookie,
      },
      environment: {
        isProduction,
        isNetlify,
        host,
        userAgent,
        referer,
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        cookieDomain: process.env.NEXTAUTH_COOKIE_DOMAIN,
      },
      headers: headerInfo,
      jwtInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Auth debug error:', error);
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Simplified version that just returns whether the user is authenticated
 * with role information
 */
export async function isAdmin() {
  try {
    const session = await getServerSession(authOptions);
    return !!session?.user && session.user.role === 'ADMIN';
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}
