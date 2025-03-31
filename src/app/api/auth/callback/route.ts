import { NextRequest } from 'next/server';
import { handleCallback } from '@/lib/auth0-config';

export async function GET(req: NextRequest) {
  try {
    // Process the Auth0 callback and set the session
    return await handleCallback(req as any);
  } catch (error) {
    console.error('Auth0 callback error:', error);
    // Redirect to an error page
    return Response.redirect(new URL('/login?error=callback', req.url));
  }
}
