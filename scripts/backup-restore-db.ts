import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database backup and restore...');

  try {
    // Get all data from the database
    const countries = await prisma.country.findMany();
    const cities = await prisma.city.findMany();
    const routes = await prisma.route.findMany({
      include: {
        amenities: true,
      },
    });
    const amenities = await prisma.amenity.findMany();
    const users = await prisma.user.findMany();

    console.log(`Found:
      - ${countries.length} countries
      - ${cities.length} cities
      - ${routes.length} routes
      - ${amenities.length} amenities
      - ${users.length} users
    `);

    // Clear existing data
    await prisma.route.deleteMany();
    await prisma.city.deleteMany();
    await prisma.country.deleteMany();
    await prisma.amenity.deleteMany();
    await prisma.user.deleteMany();

    console.log('Cleared existing data');

    // Restore countries
    for (const country of countries) {
      await prisma.country.create({
        data: {
          id: country.id,
          name: country.name,
          slug: country.slug,
        },
      });
    }
    console.log('Restored countries');

    // Restore cities
    for (const city of cities) {
      await prisma.city.create({
        data: {
          id: city.id,
          name: city.name,
          slug: city.slug,
          countryId: city.countryId,
          latitude: city.latitude,
          longitude: city.longitude,
        },
      });
    }
    console.log('Restored cities');

    // Restore amenities
    for (const amenity of amenities) {
      await prisma.amenity.create({
        data: {
          id: amenity.id,
          name: amenity.name,
        },
      });
    }
    console.log('Restored amenities');

    // Restore routes with their amenities
    for (const route of routes) {
      await prisma.route.create({
        data: {
          id: route.id,
          departureCityId: route.departureCityId,
          destinationCityId: route.destinationCityId,
          departureCountryId: route.departureCountryId,
          destinationCountryId: route.destinationCountryId,
          routeSlug: route.routeSlug,
          displayName: route.displayName,
          viatorWidgetCode: route.viatorWidgetCode,
          metaTitle: route.metaTitle,
          metaDescription: route.metaDescription,
          metaKeywords: route.metaKeywords,
          seoDescription: route.seoDescription,
          isAirportPickup: route.isAirportPickup || false,
          isAirportDropoff: route.isAirportDropoff || false,
          isCityToCity: route.isCityToCity || false,
          otherStops: route.otherStops,
          travelTime: route.travelTime,
          amenities: {
            connect: route.amenities.map(a => ({ id: a.id })),
          },
        },
      });
    }
    console.log('Restored routes with amenities');

    // Restore users
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    }
    console.log('Restored users');

    console.log('Database backup and restore completed successfully!');
  } catch (error) {
    console.error('Error during backup/restore:', error);
    throw error;
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
