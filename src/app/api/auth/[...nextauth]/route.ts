// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = 'nodejs';

// Add CORS headers to response
function addCorsHeaders(response: Response) {
  const origin = process.env.NEXTAUTH_URL || 'https://findshuttles.netlify.app';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie');
  return response;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  const origin = process.env.NEXTAUTH_URL || 'https://findshuttles.netlify.app';
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'Set-Cookie',
    },
  });
}

// Initialize NextAuth with the options
const handler = NextAuth(authOptions);

// Export named handlers for GET and POST as required by App Router
export async function GET(request: Request, context: any) {
  console.log('Auth GET request:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    cookies: request.headers.get('cookie'),
  });
  
  const response = await handler(request, context);
  
  console.log('Auth GET response:', {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  });
  
  return addCorsHeaders(response);
}

export async function POST(request: Request, context: any) {
  console.log('Auth POST request:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    cookies: request.headers.get('cookie'),
  });
  
  const response = await handler(request, context);
  
  console.log('Auth POST response:', {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  });
  
  return addCorsHeaders(response);
}
