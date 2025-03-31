// src/app/api/auth/callback/route.ts
import { auth0 } from '@/lib/auth0-config';
import { NextRequest } from 'next/server';

// This route handles the Auth0 callback after successful authentication
export async function GET(req: NextRequest) {
  try {
    // Process the Auth0 callback response
    return await auth0.handleCallback(req as any, {
      // Optional callback operations could be added here
      // For example, additional user profile enrichment
      afterCallback: async (req, res, session) => {
        // Add admin role information if present in Auth0 user metadata
        if (session?.user) {
          // If the user has roles in Auth0, add them to the session
          if (session.user['https://findshuttles.app/roles']) {
            session.user.role = session.user['https://findshuttles.app/roles'][0];
          }
          
          // If the user is the admin email, set the role as ADMIN
          if (session.user.email === 'aiaffiliatecom@gmail.com') {
            session.user.role = 'ADMIN';
          }
          
          console.log('Auth0 callback processed for user:', 
            session.user.email || session.user.sub, 
            'Role:', session.user.role || 'none');
        }
        
        return session;
      }
    });
  } catch (error) {
    console.error('Auth0 callback error:', error);
    return new Response(JSON.stringify({ error: 'Authentication callback error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
