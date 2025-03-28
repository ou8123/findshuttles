// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Import from the new location

// Initialize NextAuth with the options
const handler = NextAuth(authOptions);

// Export named handlers for GET and POST as required by App Router
export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
  return handler(request, context);
}

export async function POST(request: Request, context: { params: { nextauth: string[] } }) {
  return handler(request, context);
}