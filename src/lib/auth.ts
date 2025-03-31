// src/lib/auth.ts
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma"; // Import shared Prisma client
import bcrypt from "bcrypt";
// Later: import { PrismaAdapter } from "@auth/prisma-adapter";

// Simple in-memory store for failed login attempts
// For production, use Redis or database
interface LoginAttemptStore {
  [key: string]: {
    attempts: number;
    lockUntil: number | null;
  };
}

const loginAttemptStore: LoginAttemptStore = {};
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// Check if login is allowed
function checkLoginAttempts(identifier: string): boolean {
  // Clean up expired locks
  Object.keys(loginAttemptStore).forEach(key => {
    if (loginAttemptStore[key].lockUntil && loginAttemptStore[key].lockUntil! < Date.now()) {
      delete loginAttemptStore[key];
    }
  });
  
  // Initialize if not exists
  if (!loginAttemptStore[identifier]) {
    loginAttemptStore[identifier] = {
      attempts: 0,
      lockUntil: null
    };
  }
  
  // Check if locked
  if (loginAttemptStore[identifier].lockUntil && loginAttemptStore[identifier].lockUntil! > Date.now()) {
    return false;
  }
  
  return true;
}

// Record failed attempt
function recordFailedAttempt(identifier: string): void {
  if (!loginAttemptStore[identifier]) {
    loginAttemptStore[identifier] = {
      attempts: 0,
      lockUntil: null
    };
  }
  
  loginAttemptStore[identifier].attempts++;
  
  // Lock after max attempts
  if (loginAttemptStore[identifier].attempts >= MAX_FAILED_ATTEMPTS) {
    loginAttemptStore[identifier].lockUntil = Date.now() + LOCK_TIME_MS;
    console.log(`Account ${identifier} locked for 15 minutes due to too many failed attempts`);
  }
}

// Reset attempts on successful login
function resetLoginAttempts(identifier: string): void {
  delete loginAttemptStore[identifier];
}

// Extract domain from NEXTAUTH_URL
function extractDomainFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname; // This returns just the hostname without port
  } catch (error) {
    console.error('Failed to parse NEXTAUTH_URL:', error);
    return undefined;
  }
}

// Configure using available environment variables with fallbacks
const isProduction = process.env.NODE_ENV === 'production';
const isNetlify = !!process.env.NETLIFY || !!process.env.NEXT_USE_NETLIFY_EDGE;
// Use a shorter name to avoid hitting cookie size limits
const cookiePrefix = isProduction ? '__Secure-' : '';
// Extract domain from NEXTAUTH_URL instead of hardcoding
const domain = process.env.NEXTAUTH_COOKIE_DOMAIN || 
               extractDomainFromUrl(process.env.NEXTAUTH_URL) || 
               (isProduction ? undefined : undefined); // Remove hardcoded fallback

// Log startup configuration for debugging
console.log(`Auth config - Production: ${isProduction}, Netlify: ${isNetlify}, Domain: ${domain || 'default'}, NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`);

export const authOptions: AuthOptions = {
  // Later: adapter: PrismaAdapter(prisma),
  // Enhanced cookie configuration for Netlify
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: isNetlify ? "none" : "lax", // use "none" for Netlify to allow cross-site cookies
        path: "/",
        secure: isProduction,
        domain: domain,
        // Set max-age explicitly to ensure the cookie persists
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: isNetlify ? "none" : "lax",
        path: "/",
        secure: isProduction,
        domain: domain,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: isNetlify ? "none" : "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Get the request IP if available
        const ip = req?.headers?.['x-forwarded-for'] || 
                  req?.headers?.['x-real-ip'] || 
                  'unknown';
        
        console.log(`Auth attempt from IP: ${ip}, Email: ${credentials?.email || 'not provided'}`);
        
        if (!credentials?.email || !credentials?.password) {
          console.error("Auth Error: Missing email or password");
          return null;
        }
        
        // Create a unique identifier using email and IP
        const loginIdentifier = `${credentials.email.toLowerCase()}-${ip}`;
        
        // Check if this account is locked due to too many attempts
        if (!checkLoginAttempts(loginIdentifier)) {
          console.log(`Auth Attempt Blocked: Too many failed attempts for ${credentials.email}`);
          // We intentionally don't tell the user the account is locked
          return null;
        }

        try {
          console.log(`Attempting to find user: ${credentials.email}`);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });
          
          // Similar response time whether user exists or not (protection against timing attacks)
          if (!user) {
            await bcrypt.hash('dummy-password-for-timing', 10); // Simulate work
            console.log(`Auth Attempt Failed: No user found for email ${credentials.email}`);
            recordFailedAttempt(loginIdentifier);
            return null; // User not found
          }

          // Check if user has a hashed password
          if (!user.hashedPassword) {
             console.log(`Auth Attempt Failed: User ${credentials.email} has no password set.`);
             recordFailedAttempt(loginIdentifier);
             return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );

          if (!isPasswordValid) {
            console.log(`Auth Attempt Failed: Invalid password for user ${credentials.email}`);
            recordFailedAttempt(loginIdentifier);
            return null; // Password invalid
          }

          // Success - reset failed attempts
          resetLoginAttempts(loginIdentifier);
          console.log(`Auth Success: User ${credentials.email} authenticated from IP ${ip}`);
          
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            // Add name or other fields if needed
          };

        } catch (error) {
          console.error("Authorize Error:", error);
          return null; // Return null on any error during authorization
        }
      }
    })
    // Add other providers like Google, GitHub later if needed
  ],
  session: {
    strategy: "jwt", // Use JWT for sessions
    maxAge: 24 * 60 * 60, // 24 hours (shorter than default)
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours (shorter than default)
  },
  // Explicitly define secure paths using the obscured login path
  pages: {
    signIn: '/secure-access-9b1c3f5d7e', // This matches our middleware token
    // Don't set custom signOut path, use the default NextAuth behavior
    error: '/secure-access-9b1c3f5d7e', // Use the same secure path
  },
  // Allow origin header for Netlify
  useSecureCookies: isProduction,
  // Increase debug info
  debug: isNetlify || process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, user }) {
      // Add user details to JWT
      if (user) {
        token.role = user.role;
        token.sub = user.id; // Ensure sub is set to user ID
      }
      return token;
    },
    async session({ session, token }) {
      // Add user details to session
      if (session?.user && token) {
        session.user.role = token.role as string;
        session.user.id = token.sub;
      }
      return session;
    },
  },
  // Enhanced security options
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-netlify-testing-only',
};
