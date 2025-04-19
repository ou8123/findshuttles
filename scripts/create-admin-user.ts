import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'aiaffiliatecom@gmail.com'; // Corrected email
    const password = 'Bsssap1!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        hashedPassword,
        role: 'ADMIN'
      },
      create: {
        email,
        hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log('Admin user created/updated successfully:', user.email);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
