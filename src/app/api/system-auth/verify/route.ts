import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_AUTH_COOKIE, verifyToken } from '@/lib/system-auth';

export async function GET(req: NextRequest) {
  try {
    // Get the token from cookies
    const token = req.cookies.get(SYSTEM_AUTH_COOKIE)?.value;
    
    // If no token, the user is not authenticated
    if (!token) {
      return NextResponse.json(
        { isAuthenticated: false, message: 'No authentication token found' },
        { status: 200 }
      );
    }
    
    // Verify the token
    const user = verifyToken(token);
    
    if (user) {
      return NextResponse.json(
        { 
          isAuthenticated: true,
          user: {
            email: user.email,
            role: user.role
          }
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { isAuthenticated: false, message: 'Invalid or expired token' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('System auth verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during authentication verification' },
      { status: 500 }
    );
  }
}
