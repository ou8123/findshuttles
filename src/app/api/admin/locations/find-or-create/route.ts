// src/app/api/admin/locations/find-or-create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { generateSlug } from '@/lib/utils'; // Uses the updated normalization
import { Prisma } from '@prisma/client';

interface RequestBody {
  cityName: string;
  countryName: string;
  latitude?: number | null;
  longitude?: number | null;
}

// Update return type to match CityLookup in AddRouteForm
interface FoundOrCreatedCity {
    id: string;
    name: string;
    slug: string;
    country: {
        name: string;
        slug: string;
    };
}

export async function POST(request: Request) {
  // 1. Check Authentication and Authorization
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (!session || userRole !== 'ADMIN') {
    console.log("Find-or-create Location POST: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Request Body
  let body: RequestBody;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Find-or-create Location POST: Invalid JSON body.", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Validate Incoming Data
  const { cityName, countryName, latitude, longitude } = body;
  if (!cityName?.trim() || !countryName?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: cityName, countryName' },
      { status: 400 }
      );
    }

    // Normalize city name (remove accents)
    const normalizedCityName = cityName
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const trimmedCountryName = countryName.trim();

    // 4. Generate Slugs using normalized names
    const cityBaseSlug = generateSlug(normalizedCityName); // Use normalized name for slug base
    const countrySlug = generateSlug(trimmedCountryName); // Country names usually don't need normalization, but use the same func

    if (!cityBaseSlug || !countrySlug) {
      return NextResponse.json({ error: 'Could not generate valid slugs for city or country name' }, { status: 400 });
  }

  // Generate city slug with country name
  const citySlug = `${cityBaseSlug}-${countrySlug}`;

  // 5. Find or Create Country and City using Prisma Upsert
  try {
    // Upsert Country
    const country = await prisma.country.upsert({
      where: { slug: countrySlug },
      update: {}, // No updates needed if found
      create: {
        name: trimmedCountryName,
        slug: countrySlug,
      },
    });
    console.log(`Find-or-create Location: Found/Created country ${country.name} (ID: ${country.id})`);

    // Upsert City within the Country
    const city = await prisma.city.upsert({
      where: {
        name_countryId: {
          name: normalizedCityName, // Use normalized name in where clause
          countryId: country.id,
        }
      },
      update: {
        // Update the slug to ensure it includes country name
        slug: citySlug
      },
      create: {
        name: normalizedCityName, // Save normalized name
        slug: citySlug,
        countryId: country.id,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      include: {
        country: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    });
    console.log(`Find-or-create Location: Found/Created city ${city.name} (ID: ${city.id}) with coords (${latitude}, ${longitude}) in ${country.name}`);

    // 6. Return the found/created city data with country info
    const result: FoundOrCreatedCity = {
        id: city.id,
        name: city.name,
        slug: city.slug,
        country: {
            name: city.country.name,
            slug: city.country.slug
        }
    };
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Find-or-create Location POST: Error during upsert.", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`Prisma Error Code: ${error.code}`);
    }

    return NextResponse.json(
      { error: 'Failed to find or create location in database' },
      { status: 500 }
    );
  }
}
