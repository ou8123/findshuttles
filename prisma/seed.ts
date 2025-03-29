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

  // Create Montezuma del Sol (fictional)
  const montezuma = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Montezuma del Sol',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Montezuma del Sol',
      slug: 'montezuma-del-sol',
      countryId: costaRica.id,
      latitude: 9.6547,
      longitude: -85.0694,
    },
  });
  console.log('Created/found city:', montezuma.name, 'in', costaRica.name);

  // Create Puerto Luna (fictional)
  const puertoLuna = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Puerto Luna',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Puerto Luna',
      slug: 'puerto-luna',
      countryId: costaRica.id,
      latitude: 9.9567,
      longitude: -84.8456,
    },
  });
  console.log('Created/found city:', puertoLuna.name, 'in', costaRica.name);

  // Create Valle Verde (fictional)
  const valleVerde = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Valle Verde',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Valle Verde',
      slug: 'valle-verde',
      countryId: costaRica.id,
      latitude: 9.7456,
      longitude: -84.2345,
    },
  });
  console.log('Created/found city:', valleVerde.name, 'in', costaRica.name);

  // Create Montezuma del Sol to Puerto Luna route
  const route = await prisma.route.upsert({
    where: { routeSlug: 'montezuma-del-sol-to-puerto-luna' },
    update: {},
    create: {
      departureCityId: montezuma.id,
      destinationCityId: puertoLuna.id,
      departureCountryId: costaRica.id,
      destinationCountryId: costaRica.id,
      routeSlug: 'montezuma-del-sol-to-puerto-luna',
      displayName: 'Shuttles from Montezuma del Sol to Puerto Luna',
      viatorWidgetCode: `
        <div 
          class="viator-widget" 
          data-widget-type="products"
          data-destination-id="80003"
          data-top-x="5"
          data-language="en"
          data-currency="USD"
        ></div>
      `,
      metaTitle: 'Montezuma del Sol to Puerto Luna | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from Montezuma del Sol to Puerto Luna. Easy online booking with reliable local providers.',
      metaKeywords: 'Montezuma del Sol, Puerto Luna, Costa Rica shuttle, transfer service',
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