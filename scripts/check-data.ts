import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const countries = await prisma.country.findMany({
      include: {
        cities: true,
      },
    });
    console.log('Countries and Cities:', JSON.stringify(countries, null, 2));

    const amenities = await prisma.amenity.findMany();
    console.log('\nAmenities:', JSON.stringify(amenities, null, 2));

    const routes = await prisma.route.findMany({
      include: {
        departureCity: true,
        destinationCity: true,
        amenities: true,
      },
    });
    console.log('\nRoutes with Amenities:', JSON.stringify(routes, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
