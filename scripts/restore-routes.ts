import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Restoring all routes...');

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

  // Get or create San Jose city
  const sanJose = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'San Jose',
        countryId: costaRica.id
      }
    },
    update: {
      latitude: 9.9281,
      longitude: -84.0907,
    },
    create: {
      name: 'San Jose',
      slug: 'san-jose-costa-rica',
      countryId: costaRica.id,
      latitude: 9.9281,
      longitude: -84.0907,
    },
  });
  console.log('Using city:', sanJose.name);

  // Get or create Santa Teresa city
  const santaTeresa = await prisma.city.upsert({
    where: { 
      name_countryId: {
        name: 'Santa Teresa',
        countryId: costaRica.id
      }
    },
    update: {
      latitude: 9.6433,
      longitude: -85.1677,
    },
    create: {
      name: 'Santa Teresa',
      slug: 'santa-teresa-costa-rica',
      countryId: costaRica.id,
      latitude: 9.6433,
      longitude: -85.1677,
    },
  });
  console.log('Using city:', santaTeresa.name);

  // Get or create Jaco city
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
  console.log('Using city:', jaco.name);

  // Create amenities
  const amenities = [
    { name: 'Private Shuttle' },
    { name: 'A/C' },
    { name: 'WiFi' },
    { name: 'Driver Will Make Stops on Request' },
    { name: 'Hotel Pickup' },
    { name: 'Airport Pickup' },
    { name: 'Bottled Water' },
    { name: 'Car Seats Available' },
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
  console.log('Created/updated route:', sanJoseToSantaTeresa.routeSlug);

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

  // Create San Jose to Jaco route
  const sanJoseToJaco = await prisma.route.upsert({
    where: { routeSlug: 'san-jose-to-jaco' },
    update: {},
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
  console.log('Created/updated route:', sanJoseToJaco.routeSlug);

  // Add amenities to San Jose to Jaco route
  await prisma.route.update({
    where: { routeSlug: 'san-jose-to-jaco' },
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
  console.log('Added amenities to San Jose to Jaco route');

  console.log('All routes restored successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
