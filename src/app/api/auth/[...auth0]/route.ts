import { handleAuth } from '@auth0/nextjs-auth0';

// Export the handler function
export const GET = handleAuth();
export const POST = GET;
