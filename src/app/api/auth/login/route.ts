import { NextRequest, NextResponse } from 'next/server';
import { handleLogin } from '@/lib/auth0-config';

export async function GET(req: NextRequest) {
  try {
    // Handle Auth0 login
    return await handleLogin(req as any, {
      returnTo: '/admin', // Redirect to admin after login
      authorizationParams: {
        prompt: 'login', // Force login screen
      },
    });
  } catch (error) {
    console.error('Auth0 login error:', error);
    // Redirect to an error page
    return NextResponse.redirect(new URL('/login?error=auth', req.url));
  }
}
