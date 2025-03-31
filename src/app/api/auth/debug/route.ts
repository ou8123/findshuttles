import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Debug route for troubleshooting auth issues
 * This provides visibility into what's happening with authentication
 */
export async function GET(request: Request) {
  // Work directly with request headers
  const requestHeaders = new Headers(request.headers);
  const isProduction = process.env.NODE_ENV === 'production';
  const cookiePrefix = isProduction ? '__Secure-' : '';
  const cookieName = `${cookiePrefix}next-auth.session-token`;
  
  // Environment and config information
  const environment = {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'Not set',
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    isNetlify: !!process.env.NETLIFY || !!process.env.NEXT_USE_NETLIFY_EDGE,
    hostname: requestHeaders.get('host') || 'unknown',
  };
  
  // Get cookies info from request headers (omit actual values for security)
  const cookieHeader = requestHeaders.get('cookie') || '';
  const cookiePairs = cookieHeader.split(';').map(pair => pair.trim());
  const cookiesInfo = cookiePairs
    .filter(pair => pair) // Filter out empty strings
    .map(pair => {
      const [name, ...valueParts] = pair.split('=');
      const value = valueParts.join('='); // Rejoin in case value contains '='
      return {
        name,
        value: name.includes('csrf') || name.includes('token') 
          ? '[REDACTED FOR SECURITY]' 
          : value,
        isSessionCookie: name === cookieName,
      };
    });
  
  // Try to get the authentication token
  let tokenInfo: any = { exists: false };
  try {
    const token = await getToken({ 
      req: request as any, // Type casting required
      secureCookie: isProduction,
      cookieName,
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-netlify-testing-only',
    });
    
    if (token) {
      // Handle numeric token fields safely
      const expTime = typeof token.exp === 'number' ? token.exp : 0;
      const iatTime = typeof token.iat === 'number' ? token.iat : 0;
      
      tokenInfo = {
        exists: true,
        exp: expTime ? new Date(expTime * 1000).toISOString() : undefined,
        iat: iatTime ? new Date(iatTime * 1000).toISOString() : undefined,
        hasRole: !!token.role,
        role: token.role,
        subject: token.sub || null,
      };
    }
  } catch (error) {
    tokenInfo = {
      error: "Failed to decode token",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  
  // Headers information (filtering out sensitive data)
  const headersInfo: Record<string, string> = {};
  requestHeaders.forEach((value, key) => {
    if (!key.includes('cookie') && !key.includes('auth')) {
      headersInfo[key] = value;
    }
  });
  
  // Return the debug information
  return NextResponse.json({
    status: 'Auth Debug Info',
    timestamp: new Date().toISOString(),
    request: {
      url: request.url,
      method: 'GET',
    },
    environment,
    headers: headersInfo,
    cookies: cookiesInfo,
    auth: {
      token: tokenInfo,
    }
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });
}
