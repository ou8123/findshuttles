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
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ],
  // Configure route rewrites for Netlify
  rewrites: async () => {
    return {
      beforeFiles: [
        // Admin routes
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
        },
        // API routes
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
        // Auth routes
        {
          source: '/api/auth/:path*',
          destination: '/api/auth/:path*',
        },
        // Locations API
        {
          source: '/api/locations',
          destination: '/api/locations',
        }
      ]
    }
  }
};

module.exports = nextConfig;
