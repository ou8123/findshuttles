import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Replicate the slug generation function (ensure it matches the one in your API route)
function generateNormalizedSlug(name: string): string {
  const normalizedName = name
    .normalize('NFD') // Separate accents from characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove accent characters

  return normalizedName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters (excluding spaces and hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function main() {
  console.log('Starting script to update Costa Rica city slugs...');

  try {
    // 1. Find Costa Rica country ID
    const costaRica = await prisma.country.findUnique({
      where: { slug: 'costa-rica' },
      select: { id: true, name: true }, // Select id and name
    });

    if (!costaRica) {
      console.error('Error: Country "Costa Rica" not found.');
      return;
    }
    console.log(`Found Costa Rica with ID: ${costaRica.id}`);

    // 2. Find Costa Rican cities whose slugs DO NOT end with '-costa-rica'
    const citiesToUpdate = await prisma.city.findMany({
      where: {
        countryId: costaRica.id,
        NOT: {
          slug: {
            endsWith: '-costa-rica',
          },
        },
      },
    });

    if (citiesToUpdate.length === 0) {
      console.log('No Costa Rican cities found needing slug updates.');
      return;
    }

    console.log(`Found ${citiesToUpdate.length} Costa Rican cities to update...`);

    // 3. Loop and update each city
    for (const city of citiesToUpdate) {
      const newSlug = generateNormalizedSlug(`${city.name} ${costaRica.name}`); // Combine city and country name
      console.log(`Updating city "${city.name}" (ID: ${city.id}):`);
      console.log(`  Old slug: ${city.slug}`);
      console.log(`  New slug: ${newSlug}`);

      try {
        await prisma.city.update({
          where: { id: city.id },
          data: { slug: newSlug },
        });
        console.log(`  Successfully updated slug for "${city.name}".`);
      } catch (updateError) {
        console.error(`  Failed to update slug for "${city.name}" (ID: ${city.id}):`, updateError);
        // Decide if you want to continue or stop on error
      }
      console.log('---'); // Separator
    }

    console.log('Finished updating Costa Rica city slugs.');

  } catch (error) {
    console.error('An error occurred during the script execution:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from database.');
  }
}

main();
