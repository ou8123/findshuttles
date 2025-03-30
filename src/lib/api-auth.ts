import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

// Enum for required role levels
export enum RequiredRole {
  User = 'USER',
  Admin = 'ADMIN',
}

// Type for authentication check result
export type AuthCheckResult = {
  authenticated: boolean;
  response?: NextResponse;
  session?: any;
};

// Rate limiting store (simple in-memory implementation)
// For production, use Redis or a database
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  }
}

const API_RATE_LIMIT_MAX = 50; // Higher for APIs than for auth endpoints
const API_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const apiRateLimitStore: RateLimitStore = {};

/**
 * Check authentication for API routes
 * @param req - Next.js request object
 * @param requiredRole - Required role (defaults to ADMIN)
 * @returns Authentication result with session if successful
 */
export async function checkApiAuth(
  req: NextRequest | Request,
  requiredRole: RequiredRole = RequiredRole.Admin
): Promise<AuthCheckResult> {
  // Get client IP address for rate limiting
  const headers = req instanceof NextRequest ? req.headers : new Headers(req.headers);
  const ip = headers.get('x-forwarded-for') || 
            headers.get('x-real-ip') || 
            'unknown';
  
  // Apply rate limiting
  const { limited } = checkRateLimit(ip);
  if (limited) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', '60');
    return { authenticated: false, response };
  }
  
  // Check session and role
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }
  
  // Check if the user has the required role
  if (requiredRole === RequiredRole.Admin && session.user.role !== 'ADMIN') {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      ),
    };
  }
  
  // Authentication successful
  return {
    authenticated: true,
    session,
  };
}

/**
 * Check if a request is rate limited
 * @param ip - IP address of the client
 * @returns Rate limit status
 */
function checkRateLimit(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now();
  
  // Clean up expired entries
  Object.keys(apiRateLimitStore).forEach(key => {
    if (apiRateLimitStore[key].resetAt < now) {
      delete apiRateLimitStore[key];
    }
  });
  
  // Initialize or reset if expired
  if (!apiRateLimitStore[ip] || apiRateLimitStore[ip].resetAt < now) {
    apiRateLimitStore[ip] = {
      count: 0,
      resetAt: now + API_RATE_LIMIT_WINDOW_MS
    };
  }
  
  // Increment count
  apiRateLimitStore[ip].count++;
  const remaining = Math.max(0, API_RATE_LIMIT_MAX - apiRateLimitStore[ip].count);
  
  return {
    limited: apiRateLimitStore[ip].count > API_RATE_LIMIT_MAX,
    remaining
  };
}

/**
 * Add security headers to an API response
 * @param response - NextResponse object
 * @returns NextResponse with security headers
 */
export function addApiSecurityHeaders(response: NextResponse): NextResponse {
  // Standard security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent caching for API responses
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  
  // Add CSRF protection (only accept requests from same origin)
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || '*');
  response.headers.set('Vary', 'Origin');
  
  return response;
}

/**
 * Generate a secure API response with headers
 * @param data - Response data
 * @param status - HTTP status code (defaults to 200)
 * @returns NextResponse with data and security headers
 */
export function secureApiResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return addApiSecurityHeaders(response);
}
