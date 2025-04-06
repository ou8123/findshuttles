import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addColumn() {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "additionalInstructions" TEXT;'
    );
    console.log('Column added successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addColumn();
