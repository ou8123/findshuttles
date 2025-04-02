import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  checkApiAuth,
  RequiredRole,
  secureApiResponse
} from '@/lib/api-auth';
// Removed duplicate Prisma import

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
export async function GET(request: NextRequest) {
  // Check authentication with our enhanced utility
  const authCheck = await checkApiAuth(request, RequiredRole.Admin);
  if (!authCheck.authenticated) {
    // Return the pre-configured error response
    return authCheck.response;
  }

  // Parse URL query parameters for pagination and search
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '25'); // Default limit
  const search = url.searchParams.get('search') || '';

  // Validate pagination
  const validPage = page > 0 ? page : 1;
  const validLimit = limit > 0 && limit <= 100 ? limit : 25; // Max limit 100
  const skip = (validPage - 1) * validLimit;


  try {
    // Build where clause for search
    let where: Prisma.CountryWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.country.count({ where });

    // Get paginated countries
    const countries = await prisma.country.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: { name: 'asc' },
    });

    // Return paginated result using secureApiResponse
    // Note: secureApiResponse already adds Cache-Control: no-store
    return secureApiResponse({
        countries,
        pagination: {
            page: validPage,
            limit: validLimit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / validLimit),
            hasMore: skip + countries.length < totalCount
        }
     });
  } catch (error) {
    console.error("Admin Countries GET Error:", error);
    return secureApiResponse(
      { error: 'Failed to fetch countries' }, 
      500
    );
  }
}

// POST handler to create a new country
export async function POST(request: Request) {
  // Check authentication
  const authCheck = await checkApiAuth(request, RequiredRole.Admin);
  if (!authCheck.authenticated) {
    return authCheck.response;
  }

  // Log successful authentication
  console.log(`API /api/admin/countries POST: Admin user ${authCheck.session?.user?.email} authorized`);

  // Parse request body
  let data: { name: string };
  try {
    data = await request.json();
  } catch {
    return secureApiResponse(
      { error: 'Invalid request body' }, 
      400
    );
  }

  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    return secureApiResponse(
      { error: 'Missing or invalid required field: name' }, 
      400
    );
  }

  const name = data.name.trim();
  const slug = generateSlug(name);

  if (!slug) {
    return secureApiResponse(
      { error: 'Failed to generate a valid slug from the provided name' }, 
      400
    );
  }

  try {
    const newCountry = await prisma.country.create({
      data: {
        name: name,
        slug: slug,
      },
    });
    
    console.log(`Admin Countries POST: Successfully created country ${newCountry.name} by user ${authCheck.session?.user?.email}`);
    
    // Return the new country with secure headers
    return secureApiResponse(newCountry, 201);

  } catch (error) {
    console.error("Admin Countries POST Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (likely name or slug)
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ');
        return secureApiResponse(
          { error: `A country with this ${target} already exists.` },
          409 // Conflict
        );
      }
    }
    
    // Generic error response
    return secureApiResponse(
      { error: 'Failed to create country' }, 
      500
    );
  }
}
