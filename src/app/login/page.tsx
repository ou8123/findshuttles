// src/app/login/page.tsx
"use client";

// Export dynamic to disable static generation for this page
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { signIn } from "next-auth/react";

function LoginButton() {
  // Get searchParams within the client component
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";
  
  return (
    <button 
      onClick={() => signIn('credentials', { callbackUrl })}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition"
    >
      Sign in with NextAuth
    </button>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">Admin Login</h1>
        <p className="text-gray-600 text-center mb-6">Sign in to continue</p>
        
        <Suspense fallback={
          <button
            disabled
            className="w-full bg-gray-400 text-white py-3 px-4 rounded cursor-not-allowed"
          >
            Loading...
          </button>
        }>
          <LoginButton />
        </Suspense>
        
        <p className="mt-6 text-xs text-gray-500 text-center">
          Protected area. Only authorized administrators can access.
        </p>
      </div>
    </div>
  );
}
