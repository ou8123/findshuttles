import type { NextConfig } from "next";
import path from 'path'; // Import path module

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Add alias for @/* to resolve to ./src/*
    // This helps ensure the build process finds modules imported with @/
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;
