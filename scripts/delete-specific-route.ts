import prisma from '../src/lib/prisma';

async function deleteRoute() {
  const departureCityName = 'San Jose';
  const destinationCityName = 'Quepos';

  console.log(`Attempting to delete route between "${departureCityName}" and "${destinationCityName}"...`);

  try {
    // Find the city IDs first
    const departureCity = await prisma.city.findFirst({
      where: { name: departureCityName },
      select: { id: true },
    });

    const destinationCity = await prisma.city.findFirst({
      where: { name: destinationCityName },
      select: { id: true },
    });

    if (!departureCity) {
      console.error(`Could not find city: ${departureCityName}`);
      return;
    }
    if (!destinationCity) {
      console.error(`Could not find city: ${destinationCityName}`);
      return;
    }

    console.log(`Found Departure City ID: ${departureCity.id}`);
    console.log(`Found Destination City ID: ${destinationCity.id}`);

    // Attempt to delete the route using the found IDs
    const deleteResult = await prisma.route.deleteMany({
      where: {
        departureCityId: departureCity.id,
        destinationCityId: destinationCity.id,
      },
    });

    if (deleteResult.count > 0) {
      console.log(`Successfully deleted ${deleteResult.count} route(s) between ${departureCityName} and ${destinationCityName}.`);
    } else {
      console.log(`No route found between ${departureCityName} and ${destinationCityName} to delete.`);
    }

  } catch (error) {
    console.error('Error deleting route:', error);
  }
}

deleteRoute()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
