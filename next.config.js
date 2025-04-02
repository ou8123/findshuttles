/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Explicitly tell Next.js to bundle bcrypt for serverless environments
  serverExternalPackages: ['bcrypt'],
  // Configure experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  // Configure route rewrites for Netlify
  rewrites: async () => {
    return {
      beforeFiles: [
        // Secure admin routes
        {
          source: '/management-portal-8f7d3e2a1c/:path*',
          destination: '/admin/:path*',
        },
        // Secure login route
        {
          source: '/secure-access-9b1c3f5d7e',
          destination: '/login',
        },
        // NOTE: Removed redundant API rewrites below.
        // The Netlify plugin should handle these automatically.
      ]
    }
  }
};

module.exports = nextConfig;
