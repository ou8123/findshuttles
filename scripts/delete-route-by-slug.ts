import prisma from '../src/lib/prisma';

async function deleteRouteBySlug() {
  const targetSlug = 'san-jose-costa-rica-to-quepos-costa-rica'; // The slug from the P2002 error

  console.log(`Attempting to delete route with slug "${targetSlug}"...`);

  try {
    // Attempt to delete the route using the slug
    const deleteResult = await prisma.route.deleteMany({
      where: {
        routeSlug: targetSlug,
      },
    });

    if (deleteResult.count > 0) {
      console.log(`Successfully deleted ${deleteResult.count} route(s) with slug "${targetSlug}".`);
    } else {
      console.log(`No route found with slug "${targetSlug}" to delete.`);
    }

  } catch (error) {
    console.error('Error deleting route by slug:', error);
  }
}

deleteRouteBySlug()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
