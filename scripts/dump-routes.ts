import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('Dumping routes data...');

  try {
    const routes = await prisma.route.findMany({
      include: {
        departureCity: true,
        destinationCity: true,
        departureCountry: true,
        destinationCountry: true,
        amenities: true,
      },
    });

    // Save routes to a JSON file
    fs.writeFileSync('routes-backup.json', JSON.stringify(routes, null, 2));
    console.log(`Dumped ${routes.length} routes to routes-backup.json`);

    // Print routes for inspection
    console.log('\nAvailable routes:');
    routes.forEach(route => {
      console.log(`- ${route.departureCity.name} to ${route.destinationCity.name}`);
      console.log(`  Slug: ${route.routeSlug}`);
      console.log(`  Amenities: ${route.amenities.map(a => a.name).join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error dumping routes:', error);
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
