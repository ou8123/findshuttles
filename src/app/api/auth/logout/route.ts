import { NextRequest } from 'next/server';
import { handleLogout } from '@/lib/auth0-config';

export async function GET(req: NextRequest) {
  try {
    // Process logout and clear the session
    return await handleLogout(req as any, {
      returnTo: '/', // Redirect to home page after logout
    });
  } catch (error) {
    console.error('Auth0 logout error:', error);
    // If there's an error, just redirect to home
    return Response.redirect(new URL('/', req.url));
  }
}
