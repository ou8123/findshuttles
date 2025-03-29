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

  // Create San Jose
  const sanJose = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'San Jose',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'San Jose',
      slug: 'san-jose',
      countryId: costaRica.id,
      latitude: 9.9281,
      longitude: -84.0907,
    },
  });
  console.log('Created/found city:', sanJose.name, 'in', costaRica.name);

  // Create Manuel Antonio
  const manuelAntonio = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Manuel Antonio',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Manuel Antonio',
      slug: 'manuel-antonio',
      countryId: costaRica.id,
      latitude: 9.3920,
      longitude: -84.1365,
    },
  });
  console.log('Created/found city:', manuelAntonio.name, 'in', costaRica.name);

  // Create Jaco
  const jaco = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Jaco',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Jaco',
      slug: 'jaco',
      countryId: costaRica.id,
      latitude: 9.6167,
      longitude: -84.6333,
    },
  });
  console.log('Created/found city:', jaco.name, 'in', costaRica.name);

  // Create San Jose to Manuel Antonio route
  const route = await prisma.route.upsert({
    where: { routeSlug: 'costa-rica-san-jose-to-manuel-antonio' },
    update: {},
    create: {
      departureCityId: sanJose.id,
      destinationCityId: manuelAntonio.id,
      departureCountryId: costaRica.id,
      destinationCountryId: costaRica.id,
      routeSlug: 'costa-rica-san-jose-to-manuel-antonio',
      displayName: 'Shuttles from San Jose to Manuel Antonio',
      viatorWidgetCode: '<div class="viator-widget">Sample widget code</div>',
      metaTitle: 'San Jose to Manuel Antonio, Costa Rica | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from San Jose to Manuel Antonio. Easy online booking with reliable local providers.',
      metaKeywords: 'San Jose, Manuel Antonio, Costa Rica shuttle, transfer service',
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