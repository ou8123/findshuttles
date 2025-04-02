import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { checkApiAuth, RequiredRole, secureApiResponse } from '@/lib/api-auth';

// Helper function to generate slugs (simple version) - Should match utils
function generateSlug(name: string): string {
  const normalizedName = name
    .normalize('NFD') // Separate accents from characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove accent characters

  return normalizedName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace space/underscore/hyphen with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
} // <-- Added missing closing brace for generateSlug

interface RouteContext {
  params: {
    countryId: string;
  };
}

// GET handler for single country
export async function GET(request: NextRequest, context: RouteContext) {
  const authCheck = await checkApiAuth(request, RequiredRole.Admin);
  if (!authCheck.authenticated) {
    return authCheck.response;
  }

  const { countryId } = context.params;
  if (!countryId) {
    return secureApiResponse({ error: 'Country ID is required' }, 400);
  }

  try {
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return secureApiResponse({ error: 'Country not found' }, 404);
    }

    return secureApiResponse(country);
  } catch (error) {
    console.error(`Admin Country GET /${countryId} Error:`, error);
    return secureApiResponse({ error: 'Failed to fetch country' }, 500);
  }
}


// PUT handler to update a country
export async function PUT(request: NextRequest, context: RouteContext) {
 const authCheck = await checkApiAuth(request, RequiredRole.Admin);
  if (!authCheck.authenticated) {
    return authCheck.response;
  }

  const { countryId } = context.params;
  if (!countryId) {
    return secureApiResponse({ error: 'Country ID is required' }, 400);
  }

  let data: { name: string };
  try {
    data = await request.json();
  } catch {
    return secureApiResponse({ error: 'Invalid request body' }, 400);
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    return secureApiResponse({ error: 'Missing or invalid required field: name' }, 400);
  }

  const name = data.name.trim();
  // Normalize name before generating slug and saving
   const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const slug = generateSlug(normalizedName); // Use normalized name

  if (!slug) {
    return secureApiResponse({ error: 'Failed to generate a valid slug from the provided name' }, 400);
  }

  try {
    const updatedCountry = await prisma.country.update({
      where: { id: countryId },
      data: {
        name: normalizedName, // Save normalized name
        slug: slug,
      },
    });
    console.log(`Admin Country PUT: Successfully updated country ${updatedCountry.name} by user ${authCheck.session?.user?.email}`);
    return secureApiResponse(updatedCountry);

  } catch (error) {
    console.error(`Admin Country PUT /${countryId} Error:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ');
      return secureApiResponse({ error: `A country with this ${target} already exists.` }, 409);
    }
    return secureApiResponse({ error: 'Failed to update country' }, 500);
  }
}


// DELETE handler to delete a country
export async function DELETE(request: NextRequest, context: RouteContext) {
 const authCheck = await checkApiAuth(request, RequiredRole.Admin);
  if (!authCheck.authenticated) {
    return authCheck.response;
  }

  const { countryId } = context.params;
  if (!countryId) {
    return secureApiResponse({ error: 'Country ID is required' }, 400);
  }

  try {
     // Check if country exists and if it has associated cities
    const country = await prisma.country.findUnique({
      where: { id: countryId },
      include: { _count: { select: { cities: true } } },
    });

    if (!country) {
      return secureApiResponse({ error: 'Country not found' }, 404);
    }

    // Prevent deletion if cities are associated
    if (country._count.cities > 0) {
      return secureApiResponse(
        { error: `Cannot delete country "${country.name}" because it has ${country._count.cities} associated cities.` },
        400 // Bad Request or 409 Conflict could also work
      );
    }

    // Delete the country
    await prisma.country.delete({
      where: { id: countryId },
    });
     console.log(`Admin Country DELETE: Successfully deleted country ${country.name} (ID: ${countryId}) by user ${authCheck.session?.user?.email}`);

    return new NextResponse(null, { status: 204 }); // No Content on successful delete

  } catch (error) {
    console.error(`Admin Country DELETE /${countryId} Error:`, error);
    return secureApiResponse({ error: 'Failed to delete country' }, 500);
  }
}
