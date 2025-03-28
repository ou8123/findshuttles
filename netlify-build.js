// netlify-build.js
const { execSync } = require('child_process');

// Prisma commands are now run directly in netlify.toml

// Run Next.js build with environment variables to disable static generation
console.log('Running Next.js build with static generation disabled...');
execSync('NEXT_DISABLE_STATIC_GENERATION=true next build', { stdio: 'inherit' });

console.log('Build completed successfully!');