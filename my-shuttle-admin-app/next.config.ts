/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Use standalone output mode
  experimental: {
    // Disable static generation completely
    disableStaticGeneration: true,
  },
};

export default nextConfig;