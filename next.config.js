/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Explicitly tell Next.js to bundle bcrypt for serverless environments
  serverExternalPackages: ['bcrypt'],
  
  // Enhanced cookie handling for Netlify deployment
  // This helps with authentication persistence across page transitions
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
    // Enhanced cookie handling
    cookieConfiguration: {
      sameSite: 'lax', // More compatible with Netlify's environment
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined
    }
  },
};

module.exports = nextConfig;
