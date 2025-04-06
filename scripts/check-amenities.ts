import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const route = await prisma.route.findFirst({
    include: {
      amenities: true,
      departureCity: true,
      destinationCity: true,
    }
  });

  console.log('Route:', {
    from: route?.departureCity.name,
    to: route?.destinationCity.name,
    amenities: route?.amenities.map(a => ({ name: a.name }))
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
