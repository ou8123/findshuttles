/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    serverComponentsExternalPackages: ['prisma'],
    optimizeCss: true,
    optimizeServerReact: true
  },
  // Configure image optimization
  images: {
    domains: ['res.cloudinary.com'],
    minimumCacheTTL: 3600,
    formats: ['image/webp'],
  },
  // Configure route rewrites for Netlify
  rewrites: async () => {
    return {
      beforeFiles: [
        // Special handling for social media crawlers
        {
          source: '/routes/:path*',
          has: [
            {
              type: 'header',
              key: 'user-agent',
              value: '(facebookexternalhit|Twitterbot|WhatsApp|Slackbot|LinkedInBot)(.*)'
            }
          ],
          destination: '/api/social-preview/:path*'
        },
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
        // Cloudinary image optimization
        {
          source: '/og-images/:path*',
          destination: 'https://res.cloudinary.com/dawjqh1qv/image/upload/:path*'
        }
      ]
    }
  }
};

module.exports = nextConfig;
