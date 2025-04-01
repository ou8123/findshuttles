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
  // Configure headers for Netlify
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
    },
  ],
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
        // API routes with proper handling
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
        // Auth routes with special handling
        {
          source: '/api/auth/:path*',
          destination: '/api/auth/:path*',
        },
        // Locations API with specific handling
        {
          source: '/api/locations',
          destination: '/api/locations',
        }
      ]
    }
  }
};

module.exports = nextConfig;
