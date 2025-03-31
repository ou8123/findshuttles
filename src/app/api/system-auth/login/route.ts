import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_AUTH_COOKIE, createToken } from '@/lib/system-auth';

// Hard-coded admin credentials
// In a real production app, you would store these in a database with hashed passwords
const ADMIN_CREDENTIALS = [
  {
    email: 'aiaffiliatecom@gmail.com',
    password: 'Bsssap1!',
  },
];

export async function POST(req: NextRequest) {
  try {
    // Get credentials from request body
    const body = await req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if credentials match any admin user
    const adminUser = ADMIN_CREDENTIALS.find(
      (user) => user.email === normalizedEmail && user.password === password
    );
    
    if (!adminUser) {
      // Log the attempt but keep the response vague for security
      console.log(`Failed login attempt for ${normalizedEmail}`);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create a system auth token
    const token = createToken(adminUser.email);
    
    // Prepare the success response
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Authentication successful',
      },
      { status: 200 }
    );
    
    // Set the token as an HTTP-only cookie
    response.cookies.set(SYSTEM_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('System auth login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    );
  }
}
