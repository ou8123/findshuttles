// auth0-config.js - Auth0 SDK configuration

import { initAuth0 } from '@auth0/nextjs-auth0';

export const getAuth0Config = () => {
  // Validate required environment variables
  const requiredEnvVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
  if (missingEnvVars.length > 0) {
    console.warn(`Auth0 config missing environment variables: ${missingEnvVars.join(', ')}`);
  }

  // Initialize Auth0 with environment config
  // Documentation: https://auth0.github.io/nextjs-auth0/modules/instance.html
  return initAuth0({
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    authorizationParams: {
      scope: process.env.AUTH0_SCOPE || 'openid profile email',
      audience: process.env.AUTH0_AUDIENCE || '',
    },
    routes: {
      login: '/api/auth/login',
      callback: '/api/auth/callback',
      logout: '/api/auth/logout',
      postLogoutRedirect: '/',
    },
    session: {
      rollingDuration: 60 * 60 * 24, // 24 hours in seconds
      absoluteDuration: 60 * 60 * 24 * 7, // 7 days in seconds
    },
  });
};

// Initialize Auth0
export const auth0 = getAuth0Config();

// Utility function to get session from request
export const getSession = async (req) => {
  try {
    return await auth0.getSession(req);
  } catch (error) {
    console.error('Error fetching Auth0 session:', error);
    return null;
  }
};
