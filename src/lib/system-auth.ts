import * as jwt from 'jsonwebtoken';

// Export cookie name to be used consistently
export const SYSTEM_AUTH_COOKIE = 'system-auth-token';

// Set a strong JWT secret
export const JWT_SECRET = process.env.SYSTEM_AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'this-is-a-fallback-secret-that-should-be-changed';

// Token expiration time
export const TOKEN_EXPIRATION = '24h';

/**
 * System Auth Utility
 * 
 * This utility provides functions to work with our custom system authentication.
 * It handles token verification and access checking.
 */

/**
 * Verify a system auth token string
 */
export function verifyToken(token: string) {
  try {
    if (!token) {
      return null;
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if it's a valid admin token
    if (typeof decoded === 'object' && decoded.systemAuth && decoded.role === 'ADMIN') {
      return {
        email: decoded.email,
        role: decoded.role,
        systemAuth: true
      };
    }
    
    return null;
  } catch (error) {
    console.error('System auth token verification failed:', error);
    return null;
  }
}

/**
 * Create a system auth token
 */
export function createToken(email: string) {
  return jwt.sign(
    {
      email,
      role: 'ADMIN',
      systemAuth: true,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }
  );
}
