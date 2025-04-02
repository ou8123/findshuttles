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

// Import the stealth path tokens from middleware
const ADMIN_PATH_TOKEN = 'management-portal-8f7d3e2a1c';
const LOGIN_PATH_TOKEN = 'secure-access-9b1c3f5d7e';

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
  
  // Adding protocol if missing
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = `https://${url}`;
  }
  
  try {
    const parsedUrl = new URL(fullUrl);
    return parsedUrl.hostname; // This returns just the hostname without port
  } catch (error) {
    console.error('Failed to parse NEXTAUTH_URL:', error);
    return undefined;
  }
}

// Configure using available environment variables with fallbacks
const isProduction = process.env.NODE_ENV === 'production';
const isNetlify = !!process.env.NETLIFY || !!process.env.NEXT_USE_NETLIFY_EDGE;

// For Netlify, we need to handle cookies differently
const cookiePrefix = isProduction && !isNetlify ? '__Secure-' : '';

// Get the NEXTAUTH_URL and ensure it has a protocol
let nextAuthUrl = process.env.NEXTAUTH_URL;
if (nextAuthUrl && !nextAuthUrl.startsWith('http://') && !nextAuthUrl.startsWith('https://')) {
  nextAuthUrl = `https://${nextAuthUrl}`;
}

// For Netlify, we need to handle the domain differently
let domain: string | undefined;
if (isNetlify) {
  // Use the full Netlify domain
  domain = process.env.URL ? new URL(process.env.URL).hostname : 'findshuttles.netlify.app';
} else {
  domain = process.env.NEXTAUTH_COOKIE_DOMAIN || 
           extractDomainFromUrl(nextAuthUrl) || 
           undefined;
}

// Enhanced debug logging for cookie configuration
console.log('Cookie Configuration:', {
  isNetlify,
  domain,
  isProduction,
  cookiePrefix,
  nextAuthUrl,
  allEnvVars: {
    NETLIFY: process.env.NETLIFY,
    NEXT_USE_NETLIFY_EDGE: process.env.NEXT_USE_NETLIFY_EDGE,
    URL: process.env.URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV
  }
});

// More verbose logging for debugging
console.log(`Auth config - Production: ${isProduction}, Netlify: ${isNetlify}, Domain: ${domain || 'default'}, NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}, SecureCookie: ${isProduction}, CookiePrefix: ${cookiePrefix}`);

export const authOptions: AuthOptions = {
  // Later: adapter: PrismaAdapter(prisma),
  // More relaxed cookie configuration to fix cross-site issues
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: isNetlify ? "none" : "lax",
        path: "/",
        secure: true,
        domain,
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax", // Changed to lax for all environments
        path: "/",
        secure: isProduction,
        ...(domain ? { domain } : {}),
      },
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax", // Changed to lax for all environments
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
  // Use the stealth paths for security through obscurity
  pages: {
    signIn: `/${LOGIN_PATH_TOKEN}`, // Use the stealth login path
    error: `/${LOGIN_PATH_TOKEN}`, // Also use stealth login path for errors
  },
  // Configure for Netlify environment
  useSecureCookies: true, // Enable secure cookies
  debug: process.env.NODE_ENV === 'development', // Only debug in development
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
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};
