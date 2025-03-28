// netlify-build.js
const { execSync } = require('child_process');

// Run Prisma commands
console.log('Running Prisma generate...');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('Running Prisma migrate deploy...');
execSync('npx prisma migrate deploy', { stdio: 'inherit' });

// Run Next.js build with environment variables to disable static generation
console.log('Running Next.js build with static generation disabled...');
execSync('NEXT_DISABLE_STATIC_GENERATION=true next build', { stdio: 'inherit' });

console.log('Build completed successfully!');