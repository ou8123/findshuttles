// src/app/api/auth/logout/route.ts
import { auth0 } from '@/lib/auth0-config';
import { NextRequest } from 'next/server';

// This route handles user logouts
export async function GET(req: NextRequest) {
  try {
    // Get the URL to redirect to after logout (default to homepage)
    const url = new URL(req.url);
    const returnTo = url.searchParams.get('returnTo') || '/';
    
    // Process the logout request
    return await auth0.handleLogout(req as any, {
      returnTo
    });
  } catch (error) {
    console.error('Auth0 logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
