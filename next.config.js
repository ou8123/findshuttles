/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Use standalone output mode
  // Disable static generation by setting all pages to be server-side rendered
  experimental: {
    serverComponentsExternalPackages: ['*'], // Force all packages to be bundled with the server
  },
};

module.exports = nextConfig;