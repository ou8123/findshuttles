import prisma from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

// Simple slug generation function (matching the one likely used elsewhere)
// Includes normalization to remove accents/diacritics
function generateNormalizedSlug(name: string): string {
  const normalizedName = name
    .normalize('NFD') // Separate accents from characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove accent characters

  return normalizedName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (excluding space and hyphen)
    .replace(/[\s_-]+/g, '-') // Replace space and underscore/hyphen with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function normalizeCityNames() {
  console.log('Starting city name normalization...');

  const citiesToNormalize = [
    { currentName: 'San José', normalizedName: 'San Jose' },
    { currentName: 'Sámara', normalizedName: 'Samara' },
    // Add more cities here if needed in the future
  ];

  let updatedCount = 0;

  for (const { currentName, normalizedName } of citiesToNormalize) {
    try {
      const cities = await prisma.city.findMany({
        where: {
          name: currentName,
        },
      });

      if (cities.length > 0) {
        console.log(`Found ${cities.length} instance(s) of "${currentName}". Updating...`);
        const newSlug = generateNormalizedSlug(normalizedName);

        for (const city of cities) {
          try {
            await prisma.city.update({
              where: { id: city.id },
              data: {
                name: normalizedName,
                slug: newSlug, // Regenerate slug based on normalized name
              },
            });
            console.log(`  Updated city ID ${city.id} to name "${normalizedName}" and slug "${newSlug}"`);
            updatedCount++;
          } catch (updateError) {
             // Handle potential unique constraint violation if the normalized name/slug already exists for that country
             if (updateError instanceof Prisma.PrismaClientKnownRequestError && updateError.code === 'P2002') {
               console.warn(`  Skipping update for city ID ${city.id}: Normalized name/slug ("${normalizedName}"/"${newSlug}") likely already exists for its country.`);
             } else {
               console.error(`  Failed to update city ID ${city.id}:`, updateError);
             }
          }
        }
      } else {
        console.log(`No instances of "${currentName}" found.`);
      }
    } catch (error) {
      console.error(`Error processing "${currentName}":`, error);
    }
  }

  console.log(`Normalization complete. Updated ${updatedCount} city records.`);

  // --- Update Route Content Fields ---
  console.log('\nStarting route content normalization...');
  let updatedRouteCount = 0;
  const routes = await prisma.route.findMany({
    select: {
      id: true,
      displayName: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      seoDescription: true,
    }
  });

  console.log(`Found ${routes.length} routes to check.`);

  const replacements = [
    { from: /San José/gi, to: 'San Jose' },
    { from: /Sámara/gi, to: 'Samara' },
    // Add more general replacements if needed
  ];

  for (const route of routes) {
    let needsUpdate = false;
    const dataToUpdate: {
      displayName?: string;
      metaTitle?: string | null;
      metaDescription?: string | null;
      metaKeywords?: string | null;
      seoDescription?: string | null;
    } = {};

    // Check and replace in displayName
    let currentDisplayName = route.displayName;
    for (const { from, to } of replacements) {
      if (currentDisplayName.match(from)) {
        currentDisplayName = currentDisplayName.replace(from, to);
        needsUpdate = true;
      }
    }
    if (needsUpdate && dataToUpdate.displayName === undefined) dataToUpdate.displayName = currentDisplayName;

    // Check and replace in metaTitle (nullable)
    let currentMetaTitle = route.metaTitle;
    if (currentMetaTitle) {
      let changed = false;
      for (const { from, to } of replacements) {
        if (currentMetaTitle.match(from)) {
          currentMetaTitle = currentMetaTitle.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
         dataToUpdate.metaTitle = currentMetaTitle;
         needsUpdate = true;
      }
    }

     // Check and replace in metaDescription (nullable)
    let currentMetaDescription = route.metaDescription;
    if (currentMetaDescription) {
      let changed = false;
      for (const { from, to } of replacements) {
        if (currentMetaDescription.match(from)) {
          currentMetaDescription = currentMetaDescription.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
         dataToUpdate.metaDescription = currentMetaDescription;
         needsUpdate = true;
      }
    }

     // Check and replace in metaKeywords (nullable)
    let currentMetaKeywords = route.metaKeywords;
    if (currentMetaKeywords) {
      let changed = false;
      for (const { from, to } of replacements) {
        if (currentMetaKeywords.match(from)) {
          currentMetaKeywords = currentMetaKeywords.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
         dataToUpdate.metaKeywords = currentMetaKeywords;
         needsUpdate = true;
      }
    }

     // Check and replace in seoDescription (nullable)
    let currentSeoDescription = route.seoDescription;
    if (currentSeoDescription) {
      let changed = false;
      for (const { from, to } of replacements) {
        if (currentSeoDescription.match(from)) {
          currentSeoDescription = currentSeoDescription.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
         dataToUpdate.seoDescription = currentSeoDescription;
         needsUpdate = true;
      }
    }


    // If any field was changed, update the route
    if (needsUpdate) {
      try {
        await prisma.route.update({
          where: { id: route.id },
          data: dataToUpdate,
        });
        console.log(`  Updated content for route ID ${route.id}`);
        updatedRouteCount++;
      } catch (updateError) {
        console.error(`  Failed to update content for route ID ${route.id}:`, updateError);
      }
    }
  }
   console.log(`Route content normalization complete. Updated ${updatedRouteCount} route records.`);


}

normalizeCityNames()
  .catch((e) => {
    console.error('Error running normalization script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
