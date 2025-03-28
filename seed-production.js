// seed-production.js
const { execSync } = require('child_process');

console.log('Running Prisma seed on production database...');

// Set the DATABASE_URL to the production database URL
// This will use the environment variable from Netlify
try {
  // Run the seed script
  execSync('npx prisma db seed', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      // We don't need to set DATABASE_URL here as it will use the one from Netlify
    }
  });
  
  console.log('Seed completed successfully!');
} catch (error) {
  console.error('Error seeding production database:', error);
  process.exit(1);
}