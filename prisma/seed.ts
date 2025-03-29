import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Create North Korea
  const northKorea = await prisma.country.upsert({
    where: { slug: 'north-korea' },
    update: {},
    create: {
      name: 'North Korea',
      slug: 'north-korea',
    },
  });
  console.log('Created/found country:', northKorea.name);

  // Create Pyongyang
  const pyongyang = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Pyongyang',
        countryId: northKorea.id
      }
    },
    update: {},
    create: {
      name: 'Pyongyang',
      slug: 'pyongyang',
      countryId: northKorea.id,
      latitude: 39.0392,
      longitude: 125.7625,
    },
  });
  console.log('Created/found city:', pyongyang.name, 'in', northKorea.name);

  // Create Wonsan
  const wonsan = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Wonsan',
        countryId: northKorea.id
      }
    },
    update: {},
    create: {
      name: 'Wonsan',
      slug: 'wonsan',
      countryId: northKorea.id,
      latitude: 39.1538,
      longitude: 127.4438,
    },
  });
  console.log('Created/found city:', wonsan.name, 'in', northKorea.name);

  // Create Hamhung
  const hamhung = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Hamhung',
        countryId: northKorea.id
      }
    },
    update: {},
    create: {
      name: 'Hamhung',
      slug: 'hamhung',
      countryId: northKorea.id,
      latitude: 39.9167,
      longitude: 127.5333,
    },
  });
  console.log('Created/found city:', hamhung.name, 'in', northKorea.name);

  // Create Pyongyang to Wonsan route
  const route = await prisma.route.upsert({
    where: { routeSlug: 'pyongyang-to-wonsan' },
    update: {},
    create: {
      departureCityId: pyongyang.id,
      destinationCityId: wonsan.id,
      departureCountryId: northKorea.id,
      destinationCountryId: northKorea.id,
      routeSlug: 'pyongyang-to-wonsan',
      displayName: 'Shuttles from Pyongyang to Wonsan',
      viatorWidgetCode: '<div class="viator-widget">Sample widget code</div>',
      metaTitle: 'Pyongyang to Wonsan | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from Pyongyang to Wonsan. Easy online booking with reliable local providers.',
      metaKeywords: 'Pyongyang, Wonsan, North Korea shuttle, transfer service',
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