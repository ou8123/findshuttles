// src/app/login/page.tsx
"use client";

// Export dynamic to disable static generation for this page
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNetlifyAuth } from '@/lib/netlify-auth-context';
import { signIn } from "next-auth/react";

// These components use useSearchParams and must be wrapped in Suspense
function LoginButton({ setError }: { setError: (error: string | null) => void }) {
  const { login } = useNetlifyAuth();
  
  // Get searchParams within the client component
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";
  
  // Handle Netlify Identity login
  const handleLogin = () => {
    setError(null);
    try {
      login();
    } catch (err) {
      setError("Error initiating Netlify Identity login");
      console.error("Netlify Identity error:", err);
    }
  };
  
  return (
    <button 
      onClick={handleLogin}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition"
    >
      Sign In
    </button>
  );
}

function LegacyLoginButton({ setMode }: { setMode: (mode: 'netlify' | 'nextauth') => void }) {
  // Get searchParams within the client component
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";
  
  return (
    <button 
      onClick={() => signIn('credentials', { callbackUrl })}
      className="w-full bg-gray-600 text-white py-3 px-4 rounded hover:bg-gray-700 transition"
    >
      Sign in with credentials
    </button>
  );
}

export default function LoginPage() {
  const { user, isAdmin, isLoading, login } = useNetlifyAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'netlify' | 'nextauth'>('netlify');
  
  useEffect(() => {
    // If user is already logged in and is admin, redirect to admin
    if (user && isAdmin) {
      console.log("Already authenticated with Netlify Identity as admin");
      router.push('/admin');
    }
    
    // Check for invitation token in URL - do this outside suspense boundary
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('invite_token=')) {
      console.log("Detected invitation token in login page URL");
      try {
        login();
      } catch (err) {
        setError("Error initiating Netlify Identity login");
        console.error("Netlify Identity error:", err);
      }
    }
  }, [user, isAdmin, router, login]);

  // Fallback to NextAuth (for transition period)
  const switchToNextAuth = () => {
    setMode('nextauth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  if (mode === 'netlify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2 text-center">Admin Login</h1>
          <p className="text-gray-600 text-center mb-6">Sign in with Netlify Identity</p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-center">
              {error}
            </div>
          )}
          
          <Suspense fallback={
            <button
              disabled
              className="w-full bg-blue-400 text-white py-3 px-4 rounded cursor-not-allowed"
            >
              Loading...
            </button>
          }>
            <LoginButton setError={setError} />
          </Suspense>
          
          <div className="mt-8 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Having trouble with Netlify Identity?
            </p>
            <button 
              onClick={switchToNextAuth}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Try legacy login method
            </button>
          </div>
          
          <p className="mt-6 text-xs text-gray-500 text-center">
            Protected area. Only authorized administrators can access.
          </p>
        </div>
      </div>
    );
  }

  // Legacy NextAuth login form - will be phased out
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">Legacy Admin Login</h1>
        <p className="text-gray-600 text-center mb-6">Using previous authentication system</p>
        
        <Suspense fallback={
          <button
            disabled
            className="w-full bg-gray-400 text-white py-3 px-4 rounded cursor-not-allowed"
          >
            Loading...
          </button>
        }>
          <LegacyLoginButton setMode={setMode} />
        </Suspense>
        
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Try our new authentication system:
          </p>
          <button 
            onClick={() => setMode('netlify')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Switch to Netlify Identity
          </button>
        </div>
      </div>
    </div>
  );
}
