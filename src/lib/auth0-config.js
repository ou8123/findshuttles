/**
 * Auth0 configuration for the Admin application
 * 
 * This file configures Auth0 for use with Next.js App Router
 */

import { initAuth0 } from '@auth0/nextjs-auth0';

export const auth0 = initAuth0({
  secret: process.env.AUTH0_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email',
  },
  session: {
    rollingDuration: 60 * 60 * 24, // 24 hours in seconds
  },
  hooks: {
    afterCallback: async (req, res, session) => {
      // Add admin role if user email matches admin email
      if (session.user.email === 'aiaffiliatecom@gmail.com') {
        session.user.role = 'ADMIN';
      }
      return session;
    }
  }
});

// Export useful Auth0 utilities
export const {
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile,
  withApiAuthRequired,
  withPageAuthRequired,
  getSession
} = auth0;
