import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Re-use or import slug generation function
function generateSlug(name: string): string {
  return name
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
  const countryId = searchParams.get('countryId');

  try {
    const cities = await prisma.city.findMany({
      where: countryId ? { countryId: countryId } : {}, // Filter if countryId is provided
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
    return NextResponse.json(cities);
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
  } catch (error) {
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


  const name = data.name.trim();
  const slug = generateSlug(name);

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
        name: name,
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
               { error: `A city with the name "${name}" already exists in this country.` },
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