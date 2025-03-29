import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const routes = await prisma.route.findMany({
      select: {
        routeSlug: true,
        displayName: true,
        viatorWidgetCode: true,
        departureCity: {
          select: { name: true }
        },
        destinationCity: {
          select: { name: true }
        }
      }
    });

    console.log('Available routes:', JSON.stringify(routes, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();