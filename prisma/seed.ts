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
      slug: 'san-jose-costa-rica',
      countryId: costaRica.id,
      latitude: 9.9281,
      longitude: -84.0907,
    },
  });
  console.log('Created/found city:', sanJose.name, 'in', costaRica.name);

  // Create Santa Teresa
  const santaTeresa = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Santa Teresa',
        countryId: costaRica.id
      }
    },
    update: {},
    create: {
      name: 'Santa Teresa',
      slug: 'santa-teresa-costa-rica',
      countryId: costaRica.id,
      latitude: 9.6433,
      longitude: -85.1677,
    },
  });
  console.log('Created/found city:', santaTeresa.name, 'in', costaRica.name);

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

  // Create amenities
  const amenities = [
    { name: 'Private Shuttle' },
    { name: 'A/C' },
    { name: 'WiFi' },
    { name: 'Driver Will Make Stops on Request' },
    { name: 'Hotel Pickup' },
    { name: 'Airport Pickup' },
    { name: 'Bottled Water' },
    { name: 'Bilingual Driver' },
    { name: 'Flight Delay Friendly' },
    { name: 'Alcoholic Beverages' },
    { name: 'Scenic / Wildlife Stops' },
    { name: 'Wheelchair Accessible' },
    { name: 'Service Animals Allowed' }
  ];

  // Create or update amenities
  const createdAmenities = await Promise.all(
    amenities.map(amenity =>
      prisma.amenity.upsert({
        where: { name: amenity.name },
        update: {},
        create: amenity
      })
    )
  );
  console.log('Created/updated amenities');

  // Create San Jose to Santa Teresa route
  const sanJoseToSantaTeresa = await prisma.route.upsert({
    where: { routeSlug: 'san-jose-costa-rica-to-santa-teresa-costa-rica' },
    update: {},
    create: {
      departureCityId: sanJose.id,
      destinationCityId: santaTeresa.id,
      departureCountryId: costaRica.id,
      destinationCountryId: costaRica.id,
      routeSlug: 'san-jose-costa-rica-to-santa-teresa-costa-rica',
      displayName: 'Shuttles from San Jose to Santa Teresa',
      viatorWidgetCode: `
        <div 
          data-vi-partner-id="P00097086" 
          data-vi-widget-ref="W-san-jose-santa-teresa"
        ></div>
      `,
      metaTitle: 'San Jose to Santa Teresa | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from San Jose to Santa Teresa. Easy online booking with reliable local providers.',
      metaKeywords: 'San Jose, Santa Teresa, Costa Rica shuttle, transfer service',
      seoDescription: 'Reliable shuttle service from San Jose to the beautiful beach town of Santa Teresa. Professional drivers and comfortable vehicles make your journey smooth and enjoyable.',
    },
  });
  console.log('Created/found route:', sanJoseToSantaTeresa.routeSlug);

  // Add amenities to San Jose to Santa Teresa route
  await prisma.route.update({
    where: { routeSlug: 'san-jose-costa-rica-to-santa-teresa-costa-rica' },
    data: {
      amenities: {
        connect: [
          { name: 'Private Shuttle' },
          { name: 'A/C' },
          { name: 'WiFi' },
          { name: 'Hotel Pickup' },
          { name: 'Bilingual Driver' }
        ]
      }
    }
  });
  console.log('Added amenities to San Jose to Santa Teresa route');

  // Create Montezuma del Sol to Puerto Luna route
  const montezumaRoute = await prisma.route.upsert({
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
          data-vi-partner-id="P00097086" 
          data-vi-widget-ref="W-montezuma-puerto-luna"
        ></div>
      `,
      metaTitle: 'Montezuma del Sol to Puerto Luna | Shuttle & Transfer Service',
      metaDescription: 'Convenient shuttle service from Montezuma del Sol to Puerto Luna. Easy online booking with reliable local providers.',
      metaKeywords: 'Montezuma del Sol, Puerto Luna, Costa Rica shuttle, transfer service',
      seoDescription: 'Sample SEO description for the route.',
    },
  });
  console.log('Created/found route:', montezumaRoute.routeSlug);

  // Add amenities to Montezuma del Sol to Puerto Luna route
  await prisma.route.update({
    where: { routeSlug: 'montezuma-del-sol-to-puerto-luna' },
    data: {
      amenities: {
        connect: [
          { name: 'Private Shuttle' },
          { name: 'A/C' },
          { name: 'WiFi' },
          { name: 'Hotel Pickup' },
          { name: 'Bilingual Driver' }
        ]
      }
    }
  });
  console.log('Added amenities to Montezuma del Sol to Puerto Luna route');

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
