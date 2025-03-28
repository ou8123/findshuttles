import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // Import bcrypt to hash password for seed user

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // --- Seed Countries ---
  const costaRica = await prisma.country.upsert({
    where: { slug: 'costa-rica' },
    update: {},
    create: {
      name: 'Costa Rica',
      slug: 'costa-rica',
    },
  });
  console.log(`Created/found country: ${costaRica.name}`);

  // --- Seed Cities ---
  const tamarindo = await prisma.city.upsert({
    where: { name_countryId: { name: 'Tamarindo', countryId: costaRica.id } },
    update: { // Add coordinates to update block as well
        latitude: 10.2993,
        longitude: -85.8400,
    },
    create: {
      name: 'Tamarindo',
      slug: 'tamarindo',
      latitude: 10.2993,  // Approx. Tamarindo coordinates
      longitude: -85.8400,
      countryId: costaRica.id,
    },
  });
  console.log(`Created/found city: ${tamarindo.name} in ${costaRica.name}`);

  const monteverde = await prisma.city.upsert({
    where: { name_countryId: { name: 'Monteverde', countryId: costaRica.id } },
    update: {
        latitude: 10.3000,  // Approx. Monteverde coordinates
        longitude: -84.8167,
    },
    create: {
      name: 'Monteverde',
      slug: 'monteverde',
      latitude: 10.3000,
      longitude: -84.8167,
      countryId: costaRica.id,
    },
  });
  console.log(`Created/found city: ${monteverde.name} in ${costaRica.name}`);

  const laFortuna = await prisma.city.upsert({
    where: { name_countryId: { name: 'La Fortuna', countryId: costaRica.id } },
    update: {
        latitude: 10.4667,  // Approx. La Fortuna coordinates
        longitude: -84.6333,
    },
    create: {
      name: 'La Fortuna',
      slug: 'la-fortuna',
      latitude: 10.4667,
      longitude: -84.6333,
      countryId: costaRica.id,
    },
  });
  console.log(`Created/found city: ${laFortuna.name} in ${costaRica.name}`);

  // --- Seed a Sample Route ---
  // Include country slug in the route slug
  const routeSlugTamarindoMonteverde = `${costaRica.slug}-${tamarindo.slug}-to-${monteverde.slug}`;
  const sampleRoute = await prisma.route.upsert({
    where: { routeSlug: routeSlugTamarindoMonteverde }, // Use the new slug format in the where clause
    update: {}, // Define updates if the route might already exist and need changes
    create: {
      departureCityId: tamarindo.id,
      departureCountryId: costaRica.id, // Denormalized
      destinationCityId: monteverde.id,
      destinationCountryId: costaRica.id, // Denormalized
      routeSlug: routeSlugTamarindoMonteverde,
      viatorWidgetCode: '<!-- Placeholder: Viator Widget Code for Tamarindo to Monteverde goes here -->',
      metaTitle: `Shuttle from ${tamarindo.name} to ${monteverde.name} | Costa Rica Transport`,
      metaDescription: `Book reliable shuttle service from ${tamarindo.name} to ${monteverde.name}. Safe, comfortable transport through Costa Rica's scenic routes. Reserve now!`,
      metaKeywords: `shuttle, transport, ${tamarindo.name}, ${monteverde.name}, Costa Rica, travel, bus service`,
      seoDescription: `Book your comfortable and reliable shuttle transfer from ${tamarindo.name} to ${monteverde.name}. Enjoy the scenic views of Costa Rica!`,
    },
  });
  console.log(`Created/found route: ${sampleRoute.routeSlug}`);


  // --- Seed Admin User ---
  const adminEmail = 'aiaffiliatecom@gmail.com';
  const adminPassword = 'Sh8#mK9$pL2@vN4'; // Strong password: uppercase, lowercase, numbers, special chars
  const hashedPassword = await bcrypt.hash(adminPassword, 10); // Hash the password

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // You could update the password here if needed
    create: {
      email: adminEmail,
      hashedPassword: hashedPassword,
      role: 'ADMIN', // Assign the ADMIN role
    },
  });
  console.log(`Created/found admin user: ${adminUser.email}`);


  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });