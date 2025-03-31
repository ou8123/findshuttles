'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useNetlifyAuth } from '@/lib/netlify-auth-context';
import { useSession } from 'next-auth/react';

interface AdminAuthWrapperProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional fallback UI when loading
}

/**
 * AdminAuthWrapper
 * 
 * Client-side wrapper that handles authentication for admin pages.
 * Supports both NextAuth and Netlify Identity authentication methods.
 * Will redirect unauthenticated users to the login page after a timeout.
 */
export default function AdminAuthWrapper({ 
  children, 
  fallback = <AdminLoadingState />
}: AdminAuthWrapperProps) {
  // Check both authentication systems
  const { user, isAdmin, isLoading: netlifyLoading, error: netlifyError, isTimedOut } = useNetlifyAuth();
  const { data: session, status: nextAuthStatus } = useSession();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Determine authentication status based on both systems
  useEffect(() => {
    const nextAuthReady = nextAuthStatus !== 'loading';
    const netlifyReady = !netlifyLoading || isTimedOut;
    
    // Only make a decision when both auth systems have loaded (or timed out)
    if (nextAuthReady && netlifyReady) {
      // Check if authenticated through either system
      const nextAuthAuthenticated = nextAuthStatus === 'authenticated' && 
                                   session?.user?.role === 'ADMIN';
      
      const netlifyAuthenticated = isAdmin;
      
      // Set authentication status - true if either auth system shows as authenticated
      setIsAuthenticated(nextAuthAuthenticated || netlifyAuthenticated);
      
      // Combine error states
      if (!nextAuthAuthenticated && !netlifyAuthenticated) {
        setError('Not authenticated as admin user');
      } else if (netlifyError) {
        setError(netlifyError);
      }
    }
  }, [session, nextAuthStatus, user, isAdmin, netlifyLoading, netlifyError, isTimedOut]);
  
  // Redirect if not authenticated after a delay
  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    
    if (isAuthenticated === false) { // Explicitly false, not null (still loading)
      redirectTimer = setTimeout(() => {
        console.log('Admin auth failed, redirecting to login...');
        router.push('/admin-bypass'); // Redirect to the admin bypass page
      }, 3000); // 3 second delay before redirect
    }
    
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [isAuthenticated, router]);
  
  // Return appropriate component based on auth state
  if (isAuthenticated === null) {
    // Still loading authentication status
    return fallback;
  } else if (isAuthenticated === false) {
    // Not authenticated - show error and will redirect after delay
    return <AdminAuthError error={error} />;
  }
  
  // Authenticated - show admin content
  return <>{children}</>;
}

// Loading state component
function AdminLoadingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
        <h2 className="text-xl font-semibold">Checking authentication status...</h2>
        <p className="text-gray-500">Please wait while we verify your admin access.</p>
      </div>
    </div>
  );
}

// Error component
function AdminAuthError({ error }: { error: string | null }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-3 text-lg font-medium text-red-800">Authentication Failed</h2>
        <p className="mt-2 text-sm text-red-700">{error || 'You do not have permission to access this area.'}</p>
        <p className="mt-6 text-sm text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  );
}
