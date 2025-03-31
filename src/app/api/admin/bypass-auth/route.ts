// src/app/api/admin/bypass-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// List of valid admin emails for direct login
const ADMIN_EMAILS = ['aiaffiliatecom@gmail.com'];

// Admin password used for direct logins when Netlify Identity fails
// This should be secured in environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Bsssap1!';

// Direct admin auth bypass
// This provides a fallback for when Netlify Identity isn't working
export async function POST(req: NextRequest) {
  try {
    // Log info about the request for debugging
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log('[API] Admin bypass auth attempt from IP:', clientIp);
    
    // Get the request body
    const body = await req.json();
    
    // Simple validation
    if (!body.email || !body.password) {
      console.log('[API] Invalid request - missing email or password');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Normalize email for comparison
    const email = body.email.toLowerCase().trim();
    
    // Check if this is a valid admin email
    if (!ADMIN_EMAILS.includes(email)) {
      console.log('[API] Invalid admin email attempt:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if the password matches
    if (body.password !== ADMIN_PASSWORD) {
      console.log('[API] Invalid password for admin:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    console.log('[API] Admin authenticated successfully:', email);
    
    // Generate a unique user ID for the session
    const userId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Admin authenticated - create a direct auth token
    // This is a separate token from the JWT used by NextAuth
    // It's specifically for admin access bypass
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-netlify-testing-only';
    const token = jwt.sign(
      { 
        email: email,
        userId: userId,
        role: 'ADMIN',
        isDirectAuth: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      secret
    );
    
    // Create response with success message
    const response = NextResponse.json({
      success: true,
      userId: userId,
      message: 'Admin authenticated successfully',
    });
    
    // Set cookie on the response instead of using the cookies() API
    // This approach works better with API routes
    response.cookies.set('direct-admin-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
    });
    
    return response;
  } catch (error) {
    console.error('[API] Error in admin bypass auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
