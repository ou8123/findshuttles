// netlify-reset-password.js
// This script is designed to be run on Netlify to set the admin password
// You can run it via Netlify CLI or as a build plugin

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// The email must match the admin email in the seed file
const ADMIN_EMAIL = 'aiaffiliatecom@gmail.com';
// Use the same password as in scripts/reset-password.ts
const NEW_PASSWORD = 'Bsssap1!';

async function main() {
  console.log(`Setting password for admin user: ${ADMIN_EMAIL} on Netlify production database`);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // First try to find the user
    let user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (!user) {
      // If user doesn't exist, create them
      console.log(`User ${ADMIN_EMAIL} not found. Creating new admin user...`);
      user = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ Admin user created successfully!');
    } else {
      // Update the existing user's password
      user = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { hashedPassword },
      });
      console.log('✅ Password was updated successfully!');
    }

    console.log(`Admin Email: ${ADMIN_EMAIL}`);
    console.log(`Admin Password: ${NEW_PASSWORD}`);
  } catch (error) {
    console.error('❌ Failed to update password:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
