/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Explicitly tell Next.js to bundle bcrypt for serverless environments
  // Note: The build log previously suggested this moved from experimental, 
  // but let's try the non-experimental version first.
  serverExternalPackages: ['bcrypt'], 
};

module.exports = nextConfig;