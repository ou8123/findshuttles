import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Re-use slug generation function (consider moving to a shared utils file)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CountryRouteParams {
  params: {
    countryId: string;
  };
}

// PUT handler to update a specific country
export async function PUT(request: Request, { params }: CountryRouteParams) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countryId } = params;
  let data: { name: string };

  try {
    data = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid required field: name' }, { status: 400 });
  }

  const name = data.name.trim();
  const slug = generateSlug(name);

   if (!slug) {
     return NextResponse.json({ error: 'Failed to generate a valid slug from the provided name' }, { status: 400 });
  }

  try {
    const updatedCountry = await prisma.country.update({
      where: { id: countryId },
      data: {
        name: name,
        slug: slug,
      },
    });
    console.log(`Admin Country PUT: Successfully updated country ${updatedCountry.id} by user ${session.user?.email}`);
    return NextResponse.json(updatedCountry);

  } catch (error) {
    console.error(`Admin Country PUT Error (ID: ${countryId}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (likely name or slug)
      if (error.code === 'P2002') {
         const target = (error.meta?.target as string[])?.join(', ');
        return NextResponse.json(
          { error: `A country with this ${target} already exists.` },
          { status: 409 } // Conflict
        );
      }
      // Record not found for update
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Country not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to update country' }, { status: 500 });
  }
}

// DELETE handler to delete a specific country
export async function DELETE({ params }: CountryRouteParams) { // Removed unused request parameter
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countryId } = params;

  try {
    // Attempt to delete the country
    // NOTE: This will fail if related Cities or Routes exist and cascading deletes are not set up in the schema.
    const deletedCountry = await prisma.country.delete({
      where: { id: countryId },
    });
    console.log(`Admin Country DELETE: Successfully deleted country ${deletedCountry.id} by user ${session.user?.email}`);
    // Return No Content on successful deletion
    return new NextResponse(null, { status: 204 });

  } catch (error: unknown) { // Use unknown type
    console.error(`Admin Country DELETE Error (ID: ${countryId}):`, error); // Log the actual error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Record not found for delete
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Country not found' }, { status: 404 });
      }
      // Foreign key constraint violation (related records exist)
      if (error.code === 'P2003' || error.code === 'P2014') { // Codes might vary slightly based on DB/Prisma version
         return NextResponse.json(
           { error: 'Cannot delete country because it has related cities or routes. Delete them first.' },
           { status: 409 } // Conflict
         );
      }
    }
    return NextResponse.json({ error: 'Failed to delete country' }, { status: 500 });
  }
}