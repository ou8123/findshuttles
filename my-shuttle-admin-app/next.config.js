/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Use standalone output mode
  // Use a simpler configuration to avoid regex issues
  experimental: {
    // Empty experimental section to avoid warnings
  },
};

module.exports = nextConfig;