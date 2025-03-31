// src/app/api/auth/login/route.ts
import { auth0 } from '@/lib/auth0-config';
import { NextRequest } from 'next/server';

// This route handles redirecting users to the Auth0 Universal Login page
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const returnTo = url.searchParams.get('returnTo') || '/admin';
    
    // Redirect to Auth0 login, specifying where to go after successful login
    return await auth0.handleLogin(req as any, {
      returnTo,
      authorizationParams: {
        // Request these scopes to get user profile details
        scope: process.env.AUTH0_SCOPE || 'openid profile email',
      },
    });
  } catch (error) {
    console.error('Auth0 login error:', error);
    return new Response(JSON.stringify({ error: 'Authentication error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
