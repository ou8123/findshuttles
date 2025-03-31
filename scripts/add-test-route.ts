import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding test route: San José to Jacó...');

  // Get or create Costa Rica
  const costaRica = await prisma.country.upsert({
    where: { slug: 'costa-rica' },
    update: {},
    create: {
      name: 'Costa Rica',
      slug: 'costa-rica',
    },
  });
  console.log('Using country:', costaRica.name);

  // Get or create San José city
  const sanJose = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'San José',
        countryId: costaRica.id
      }
    },
    update: {
      latitude: 9.9281,
      longitude: -84.0907,
    },
    create: {
      name: 'San José',
      slug: 'san-jose',
      countryId: costaRica.id,
      latitude: 9.9281,
      longitude: -84.0907,
    },
  });
  console.log('Using departure city:', sanJose.name);

  // Get or create Jacó city
  const jaco = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Jacó',
        countryId: costaRica.id
      }
    },
    update: {
      latitude: 9.6167,
      longitude: -84.6294,
    },
    create: {
      name: 'Jacó',
      slug: 'jaco',
      countryId: costaRica.id,
      latitude: 9.6167,
      longitude: -84.6294,
    },
  });
  console.log('Using destination city:', jaco.name);

  // Create San José to Jacó route
  const route = await prisma.route.upsert({
    where: { routeSlug: 'san-jose-to-jaco' },
    update: {
      viatorWidgetCode: `<div 
  data-vi-partner-id="P00097086" 
  data-vi-widget-ref="W-311ca00e-dc16-4c3d-951c-332e35bd0245"
></div>`,
      displayName: 'Shuttles from San José to Jacó',
      seoDescription: 'Book your shuttle transportation from San José to the beautiful beach town of Jacó. Quick, reliable service with comfortable vehicles and experienced drivers.',
    },
    create: {
      departureCityId: sanJose.id,
      destinationCityId: jaco.id,
      departureCountryId: costaRica.id,
      destinationCountryId: costaRica.id,
      routeSlug: 'san-jose-to-jaco',
      displayName: 'Shuttles from San José to Jacó',
      viatorWidgetCode: `<div 
  data-vi-partner-id="P00097086" 
  data-vi-widget-ref="W-311ca00e-dc16-4c3d-951c-332e35bd0245"
></div>`,
      metaTitle: 'San José to Jacó | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from San José to Jacó Beach. Easy online booking with reliable local providers.',
      metaKeywords: 'San José, Jacó, Costa Rica shuttle, transfer service, beach shuttle',
      seoDescription: 'Book your shuttle transportation from San José to the beautiful beach town of Jacó. Quick, reliable service with comfortable vehicles and experienced drivers.',
    },
  });
  console.log('Created/updated route:', route.routeSlug);

  console.log('Test route added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
