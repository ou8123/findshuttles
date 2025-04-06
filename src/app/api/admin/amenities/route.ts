import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Using shared authOptions

export const runtime = 'nodejs';

// GET handler to fetch all amenities (simplified for frontend lookup)
export async function GET(request: Request) {
  // Optional: Add session check if only admins should access this list
  const session = await getServerSession(authOptions);
  if (session?.user?.role?.toLowerCase() !== 'admin') {
    // Allow public access for now, but log if needed
    // console.log("Public access to amenities list."); 
    // If admin-only is required, uncomment the following lines:
    // console.error("[API GET /api/admin/amenities] Unauthorized access attempt.");
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const amenities = await prisma.amenity.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc', // Order alphabetically
      },
    });

    // Return the list wrapped in an object, matching the frontend expectation
    return NextResponse.json({ amenities }); 

  } catch (error) {
    console.error("[API GET /api/admin/amenities] Failed to fetch amenities:", error);
    return NextResponse.json({ error: 'Failed to fetch amenities' }, { status: 500 });
  }
}
