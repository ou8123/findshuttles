import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth"; // Import from new location
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Force dynamic rendering and prevent caching
export const dynamic = 'force-dynamic';

// Updated slug generation function to include normalization
function generateNormalizedSlug(name: string): string {
  const normalizedName = name
    .normalize('NFD') // Separate accents from characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove accent characters

  return normalizedName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET handler to list cities (optionally filtered by country)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // Pagination and Search Params
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25'); // Default limit
  const search = searchParams.get('search') || '';
  const countryId = searchParams.get('countryId'); // Keep existing filter

  // Validate pagination
  const validPage = page > 0 ? page : 1;
  const validLimit = limit > 0 && limit <= 100 ? limit : 25; // Max limit 100
  const skip = (validPage - 1) * validLimit;

  try {
    // Build where clause for search and country filter
    let where: Prisma.CityWhereInput = {};
    if (countryId) {
      where.countryId = countryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { country: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

     // Get total count for pagination
    const totalCount = await prisma.city.count({ where });

    // Get paginated cities
    const cities = await prisma.city.findMany({
      where,
      skip,
      take: validLimit,
      include: { // Include country name for context
        country: {
          select: { name: true }
        }
      },
      orderBy: [ // Order by country name, then city name
        { country: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    // Return paginated result
    return NextResponse.json({
        cities,
        pagination: {
            page: validPage,
            limit: validLimit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / validLimit),
            hasMore: skip + cities.length < totalCount
        }
     }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error("Admin Cities GET Error:", error);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}

// POST handler to create a new city
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: { name: string; countryId: string; latitude?: number; longitude?: number };
  try {
    data = await request.json();
  } catch { // Removed unused error variable
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '' ||
      !data.countryId || typeof data.countryId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid required fields: name, countryId' }, { status: 400 });
  }
   // Optional validation for coordinates
   if ((data.latitude != null && typeof data.latitude !== 'number') || (data.longitude != null && typeof data.longitude !== 'number')) {
       return NextResponse.json({ error: 'Invalid coordinate format (must be numbers)' }, { status: 400 });
   }

  // Normalize the name (remove accents)
  const normalizedName = data.name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const slug = generateNormalizedSlug(normalizedName); // Use normalized name for slug

  if (!slug) {
     return NextResponse.json({ error: 'Failed to generate a valid slug from the provided name' }, { status: 400 });
  }

  try {
    // Check if country exists
    const countryExists = await prisma.country.findUnique({ where: { id: data.countryId } });
    if (!countryExists) {
        return NextResponse.json({ error: 'Specified Country ID not found' }, { status: 400 });
    }

    const newCity = await prisma.city.create({
      data: {
        name: normalizedName, // Save normalized name
        slug: slug,
        countryId: data.countryId,
        latitude: data.latitude, // Optional
        longitude: data.longitude, // Optional
      },
    });
    console.log(`Admin Cities POST: Successfully created city ${newCity.name} by user ${session.user?.email}`);
    return NextResponse.json(newCity, { status: 201 });

  } catch (error) {
    console.error("Admin Cities POST Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (likely name+countryId or slug - though slug isn't unique alone)
      // The default @@unique([name, countryId]) constraint error
      if (error.code === 'P2002') {
        // Prisma often includes the fields in the meta target
         const target = (error.meta?.target as string[])?.join(', ');
         if (target?.includes('name') && target?.includes('countryId')) {
             return NextResponse.json(
               { error: `A city with the name "${normalizedName}" already exists in this country.` },
               { status: 409 } // Conflict
             );
         }
         // Handle other potential unique constraints if added later
         return NextResponse.json(
           { error: `A unique constraint violation occurred (${target || 'unknown field'}).` },
           { status: 409 }
         );
      }
    }
    return NextResponse.json({ error: 'Failed to create city' }, { status: 500 });
  }
}
