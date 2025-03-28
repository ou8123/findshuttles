// src/app/api/admin/locations/find-or-create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { generateSlug } from '@/lib/utils'; // Import the slug utility
import { Prisma } from '@prisma/client';

interface RequestBody {
  cityName: string;
  countryName: string;
  latitude?: number | null;  // Add optional coordinates
  longitude?: number | null; // Add optional coordinates
}

// Define the expected return type (matching CityLookup in AddRouteForm)
interface FoundOrCreatedCity {
    id: string;
    name: string;
    slug: string;
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
  // Extract all potential fields from the body
  const { cityName, countryName, latitude, longitude } = body;
  if (!cityName?.trim() || !countryName?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: cityName, countryName' },
      { status: 400 }
    );
  }

  const trimmedCityName = cityName.trim();
  const trimmedCountryName = countryName.trim();

  // 4. Generate Slugs
  const citySlug = generateSlug(trimmedCityName);
  const countrySlug = generateSlug(trimmedCountryName);

  if (!citySlug || !countrySlug) {
      return NextResponse.json({ error: 'Could not generate valid slugs for city or country name' }, { status: 400 });
  }

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
        // Use the unique constraint defined in schema.prisma
        name_countryId: {
          name: trimmedCityName,
          countryId: country.id,
        }
      },
      update: {}, // No updates needed if found - could add coordinate update here if desired
      create: {
        name: trimmedCityName,
        slug: citySlug,
        countryId: country.id,
        // Use coordinates from request body, defaulting to null if not provided
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });
    console.log(`Find-or-create Location: Found/Created city ${city.name} (ID: ${city.id}) with coords (${latitude}, ${longitude}) in ${country.name}`);

    // 6. Return the found/created city data (matching CityLookup)
    const result: FoundOrCreatedCity = {
        id: city.id,
        name: city.name,
        slug: city.slug,
    };
    return NextResponse.json(result, { status: 200 }); // 200 OK as it could be find or create

  } catch (error) {
    console.error("Find-or-create Location POST: Error during upsert.", error);

    // Handle potential Prisma errors specifically if needed
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Example: Log specific Prisma error codes
        console.error(`Prisma Error Code: ${error.code}`);
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Failed to find or create location in database' },
      { status: 500 }
    );
  }
}