import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// The email must match the admin email in the seed file
const ADMIN_EMAIL = 'aiaffiliatecom@gmail.com';
// This will be the new admin password - set this to your preferred password
const NEW_PASSWORD = 'shuttle1234';

async function main() {
  console.log(`Setting password for admin user: ${ADMIN_EMAIL}`);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // Update the user
    const user = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { hashedPassword },
    });

    if (user) {
      console.log('✅ Password was set successfully!');
      console.log(`Admin Email: ${ADMIN_EMAIL}`);
      console.log(`Admin Password: ${NEW_PASSWORD}`);
    } else {
      console.error('❌ Error: User not found!');
    }
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
