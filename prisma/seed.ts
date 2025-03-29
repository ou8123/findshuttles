import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Create Costa Rica
  const costaRica = await prisma.country.upsert({
    where: { slug: 'costa-rica' },
    update: {},
    create: {
      name: 'Costa Rica',
      slug: 'costa-rica',
    },
  });
  console.log('Created/found country:', costaRica.name);

  // Create Palmares (fictional)
  const palmares = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Palmares',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Palmares',
      slug: 'palmares',
      countryId: costaRica.id,
      latitude: 10.0589,
      longitude: -84.4334,
    },
  });
  console.log('Created/found city:', palmares.name, 'in', costaRica.name);

  // Create Esmeralda (fictional)
  const esmeralda = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Esmeralda',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Esmeralda',
      slug: 'esmeralda',
      countryId: costaRica.id,
      latitude: 9.8567,
      longitude: -84.3456,
    },
  });
  console.log('Created/found city:', esmeralda.name, 'in', costaRica.name);

  // Create Dorado (fictional)
  const dorado = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Dorado',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Dorado',
      slug: 'dorado',
      countryId: costaRica.id,
      latitude: 9.7456,
      longitude: -84.2345,
    },
  });
  console.log('Created/found city:', dorado.name, 'in', costaRica.name);

  // Create Palmares to Esmeralda route
  const route = await prisma.route.upsert({
    where: { routeSlug: 'palmares-to-esmeralda' },
    update: {},
    create: {
      departureCityId: palmares.id,
      destinationCityId: esmeralda.id,
      departureCountryId: costaRica.id,
      destinationCountryId: costaRica.id,
      routeSlug: 'palmares-to-esmeralda',
      displayName: 'Shuttles from Palmares to Esmeralda',
      viatorWidgetCode: '<div class="viator-widget">Sample widget code</div>',
      metaTitle: 'Palmares to Esmeralda | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from Palmares to Esmeralda. Easy online booking with reliable local providers.',
      metaKeywords: 'Palmares, Esmeralda, Costa Rica shuttle, transfer service',
      seoDescription: 'Sample SEO description for the route.',
    },
  });
  console.log('Created/found route:', route.routeSlug);

  // Create admin user
  const adminEmail = 'aiaffiliatecom@gmail.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      role: 'ADMIN',
    },
  });
  console.log('Created/found admin user:', adminUser.email);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });