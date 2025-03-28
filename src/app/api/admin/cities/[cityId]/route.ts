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

interface CityRouteParams {
  params: {
    cityId: string;
  };
}

// Define the inner params type
type CityParams = { cityId: string };

// PUT handler to update a specific city
export async function PUT(request: Request, context: { params: CityParams }) {
  const { params } = context; // Extract params from context
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cityId } = params;
  let data: { name: string; countryId: string; latitude?: number | null; longitude?: number | null }; // Allow null for coords

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
  // Optional validation for coordinates (allow null or number)
  if ((data.latitude != null && typeof data.latitude !== 'number') || (data.longitude != null && typeof data.longitude !== 'number')) {
      return NextResponse.json({ error: 'Invalid coordinate format (must be number or null)' }, { status: 400 });
  }

  const name = data.name.trim();
  const slug = generateSlug(name);

   if (!slug) {
     return NextResponse.json({ error: 'Failed to generate a valid slug from the provided name' }, { status: 400 });
  }

  try {
     // Check if country exists (important if changing country)
    const countryExists = await prisma.country.findUnique({ where: { id: data.countryId } });
    if (!countryExists) {
        return NextResponse.json({ error: 'Specified Country ID not found' }, { status: 400 });
    }

    const updatedCity = await prisma.city.update({
      where: { id: cityId },
      data: {
        name: name,
        slug: slug,
        countryId: data.countryId,
        latitude: data.latitude, // Handles null or number
        longitude: data.longitude, // Handles null or number
      },
    });
    console.log(`Admin City PUT: Successfully updated city ${updatedCity.id} by user ${session.user?.email}`);
    return NextResponse.json(updatedCity);

  } catch (error) {
    console.error(`Admin City PUT Error (ID: ${cityId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (name+countryId)
      if (error.code === 'P2002') {
         const target = (error.meta?.target as string[])?.join(', ');
         if (target?.includes('name') && target?.includes('countryId')) {
             return NextResponse.json(
               { error: `A city with the name "${name}" already exists in this country.` },
               { status: 409 } // Conflict
             );
         }
          return NextResponse.json(
           { error: `A unique constraint violation occurred (${target || 'unknown field'}).` },
           { status: 409 }
         );
      }
      // Record not found for update
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'City not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to update city' }, { status: 500 });
  }
}

// DELETE handler to delete a specific city
export async function DELETE(context: { params: CityParams }) { // Correct signature
  const { params } = context; // Extract params from context
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cityId } = params;

  try {
    // NOTE: This will fail if related Routes exist and cascading deletes are not set up.
    const deletedCity = await prisma.city.delete({
      where: { id: cityId },
    });
    console.log(`Admin City DELETE: Successfully deleted city ${deletedCity.id} by user ${session.user?.email}`);
    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    console.error(`Admin City DELETE Error (ID: ${cityId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Record not found
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'City not found' }, { status: 404 });
      }
      // Foreign key constraint (related routes exist)
       if (error.code === 'P2003' || error.code === 'P2014') {
         return NextResponse.json(
           { error: 'Cannot delete city because it has related routes. Delete them first.' },
           { status: 409 } // Conflict
         );
      }
    }
    return NextResponse.json({ error: 'Failed to delete city' }, { status: 500 });
  }
}