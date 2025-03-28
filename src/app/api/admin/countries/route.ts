import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Helper function to generate slugs (simple version)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (excluding space and hyphen)
    .replace(/[\s_-]+/g, '-') // Replace space and underscore/hyphen with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// GET handler to list all countries
export async function GET() { // Removed unused _request parameter
  // Pass request object to getServerSession for API routes
  const session = await getServerSession(authOptions);
  // Explicitly log URL if needed, otherwise remove request usage
  // console.log("API /api/admin/countries GET session:", JSON.stringify(session, null, 2)); // Log session

  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(countries);
  } catch (error) {
    console.error("Admin Countries GET Error:", error);
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
  }
}

// POST handler to create a new country
export async function POST(request: Request) {
   // Pass request object to getServerSession for API routes
  const session = await getServerSession(authOptions);
   console.log("API /api/admin/countries POST session:", JSON.stringify(session, null, 2)); // Log session

  if (session?.user?.role !== 'ADMIN') {
    // If unauthorized, return JSON, not HTML
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: { name: string };
  try {
    data = await request.json();
  } catch { // Removed unused error variable
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
    const newCountry = await prisma.country.create({
      data: {
        name: name,
        slug: slug,
      },
    });
    console.log(`Admin Countries POST: Successfully created country ${newCountry.name} by user ${session.user?.email}`);
    // Return JSON on success
    return NextResponse.json(newCountry, { status: 201 });

  } catch (error) {
    console.error("Admin Countries POST Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (likely name or slug)
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ');
        return NextResponse.json(
          { error: `A country with this ${target} already exists.` },
          { status: 409 } // Conflict
        );
      }
    }
    // Return JSON for generic errors
    return NextResponse.json({ error: 'Failed to create country' }, { status: 500 });
  }
}