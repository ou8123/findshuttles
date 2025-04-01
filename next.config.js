/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Explicitly tell Next.js to bundle bcrypt for serverless environments
  serverExternalPackages: ['bcrypt'],
  // Configure routes that need Node.js runtime
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  // Configure routes that need Node.js runtime
  rewrites: async () => {
    return {
      beforeFiles: [
        // Admin routes
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
          has: [
            {
              type: 'header',
              key: 'x-netlify',
              value: '1'
            }
          ]
        },
        // API routes
        {
          source: '/api/:path*',
          destination: '/api/:path*',
          has: [
            {
              type: 'header',
              key: 'x-netlify',
              value: '1'
            }
          ]
        }
      ]
    }
  }
};

module.exports = nextConfig;
