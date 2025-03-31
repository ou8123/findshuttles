'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNetlifyAuth } from '@/lib/netlify-auth-context';

/**
 * Emergency Admin Bypass Login Page
 * 
 * This is a temporary solution to access the admin panel when
 * NextAuth login is failing on Netlify. It directly creates a
 * JWT token and sets it as a cookie for admin access.
 * 
 * WARNING: This is not a secure long-term solution and should
 * be removed once the authentication issues are fully resolved.
 */
export default function AdminBypassPage() {
  const [email, setEmail] = useState('aiaffiliatecom@gmail.com'); // Default to the admin email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { isAdmin, isLoading, error: authError, useDirectLogin } = useNetlifyAuth();
  
  // If the user is already authenticated as admin, redirect them
  useEffect(() => {
    if (!isLoading && isAdmin) {
      router.push('/admin');
    }
  }, [isLoading, isAdmin, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // First try the direct login through the Netlify Auth context
      // This will handle setting the cookie and updating the auth state
      const loginSuccess = await useDirectLogin(email, password);
      
      if (loginSuccess) {
        // Success - display message and redirect
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        // If direct login through context failed, try the API directly as fallback
        const response = await fetch('/api/admin/bypass-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }
        
        // Success - display message and redirect
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      }
      
    } catch (err) {
      console.error('Admin bypass login error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Emergency Admin Access</h1>
          <p className="mt-2 text-gray-600">
            Use this form only when the normal login is not working.
          </p>
        </div>
        
        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-center">
            <p className="text-green-800">
              Successfully authenticated! Redirecting to admin panel...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-gray-700"
                >
                  Admin Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700"
                >
                  Admin Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
            
            <div className="mt-4 text-center">
              <a
                href="/secure-access-9b1c3f5d7e"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Return to normal login
              </a>
            </div>
          </form>
        )}
        
        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-500">
            ⚠️ This is a direct access method that bypasses Netlify Identity.
            Only use this when the standard authentication is not working.
          </p>
          
          {/* Add diagnostic info */}
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-left">
            <p className="text-xs font-medium text-gray-700">Diagnostic Information:</p>
            <ul className="mt-1 text-xs text-gray-600">
              <li>Auth State: {isLoading ? 'Loading...' : isAdmin ? 'Admin Authenticated' : 'Not Authenticated'}</li>
              <li>Auth Error: {authError || 'None'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
