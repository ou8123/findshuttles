'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface DebugInfo {
  authenticated: boolean;
  user?: {
    email?: string;
    role?: string;
    id?: string;
  };
  session?: any;
  cookieInfo?: {
    count: number;
    names: string[];
    values?: Record<string, string>;
    hasSessionToken: boolean;
    hasNextAuth: boolean;
    hasDirectAuth?: boolean;
    hasSecureCookie?: boolean;
    expectedCookieName?: string;
    hasExpectedCookie?: boolean;
  };
  environment?: {
    isProduction: boolean;
    isNetlify: boolean;
    host: string;
    userAgent: string;
    referer: string;
    nodeEnv: string;
    nextAuthUrl?: string;
    cookieDomain?: string;
  };
  headers?: Record<string, string>;
  jwtInfo?: any;
  appInfo?: {
    version: string;
    debugTimestamp: string;
    lastAuthUpdate: string;
  };
  timestamp: string;
  error?: string;
}

/**
 * Enhanced Admin Debug Page
 * 
 * This page provides comprehensive debugging information about
 * authentication state, especially useful for diagnosing Netlify
 * authentication issues like cookie persistence and JWT validation.
 */
export default function AdminDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testCookieResult, setTestCookieResult] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRedirect = searchParams.get('from') === 'auth-failure';

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Call our debug endpoint
        const response = await fetch('/api/auth/debug');
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setDebugInfo(data);
      } catch (err) {
        console.error('Error fetching debug info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
    
    // Set up periodic refresh for the debug data
    const interval = setInterval(fetchDebugInfo, 10000);  // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const testCookieSetting = async () => {
    try {
      setTestCookieResult('Testing cookie setting...');
      const response = await fetch('/api/auth/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-cookie' })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Wait a moment and then reload to check if cookie was set
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      setTestCookieResult('Test cookie request sent successfully. Reloading page...');
    } catch (err) {
      setTestCookieResult(`Error testing cookies: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Show authentication failure message if redirected here
  const AuthFailureAlert = () => {
    if (!fromRedirect) return null;
    
    return (
      <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-md">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Authentication Failed</h2>
        <p className="text-red-700">
          You were redirected here because authentication for the admin area failed.
          Use the information below to diagnose the issue.
        </p>
        <div className="mt-4 flex gap-4">
          <button 
            onClick={() => router.push('/secure-access-9b1c3f5d7e')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Normal Login
          </button>
          <button 
            onClick={() => router.push('/admin-bypass')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Try Emergency Access
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Authentication Diagnostics</h1>
          <div className="flex items-center gap-3 text-blue-800">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p>Loading authentication information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">FindShuttles Authentication Diagnostics</h1>
          <div className="text-xs text-gray-500">
            {debugInfo?.appInfo ? `v${debugInfo.appInfo.version}` : ''}
          </div>
        </div>
        
        <AuthFailureAlert />
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
            <p className="font-semibold">Error loading debug information:</p>
            <p>{error}</p>
          </div>
        ) : null}
        
        {debugInfo && (
          <div className="space-y-6">
            <div className={`p-4 rounded-md ${debugInfo.authenticated ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'} mb-4`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${debugInfo.authenticated ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <p className="font-semibold">
                  Authentication Status: {debugInfo.authenticated ? 'Authenticated' : 'Not Authenticated'}
                </p>
              </div>
              <p className="text-sm mt-1">Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}</p>
            </div>
            
            {debugInfo.error && (
              <div className="bg-red-50 p-4 rounded-md text-red-700">
                <p><strong>Error:</strong> {debugInfo.error}</p>
              </div>
            )}
            
            {/* User Information */}
            {debugInfo.authenticated && debugInfo.user && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h2 className="font-semibold text-blue-800 mb-2">User Information</h2>
                <div className="pl-4 border-l-2 border-blue-200">
                  <p><strong>Email:</strong> {debugInfo.user.email}</p>
                  <p><strong>Role:</strong> {debugInfo.user.role}</p>
                  <p><strong>ID:</strong> {debugInfo.user.id}</p>
                </div>
              </div>
            )}
            
            {/* Environment Information */}
            {debugInfo.environment && (
              <div className="bg-purple-50 p-4 rounded-md">
                <h2 className="font-semibold text-purple-800 mb-2">Environment</h2>
                <div className="pl-4 border-l-2 border-purple-200 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p><strong>Production:</strong> {debugInfo.environment.isProduction ? 'Yes' : 'No'}</p>
                  <p><strong>Netlify:</strong> {debugInfo.environment.isNetlify ? 'Yes' : 'No'}</p>
                  <p><strong>Host:</strong> {debugInfo.environment.host}</p>
                  <p><strong>NextAuth URL:</strong> {debugInfo.environment.nextAuthUrl || 'Not set'}</p>
                  <p><strong>Cookie Domain:</strong> {debugInfo.environment.cookieDomain || 'Not set'}</p>
                  <p><strong>Node Env:</strong> {debugInfo.environment.nodeEnv}</p>
                </div>
              </div>
            )}
            
            {/* Cookie Information - Critical for debugging */}
            {debugInfo.cookieInfo && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h2 className="font-semibold text-gray-700 mb-2">Cookie Information</h2>
                <div className="pl-4 border-l-2 border-gray-300">
                  <p><strong>Total Cookies:</strong> {debugInfo.cookieInfo.count}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <p>
                      <strong>Session Token:</strong> 
                      <span className={debugInfo.cookieInfo?.hasSessionToken ? "text-green-600" : "text-red-600"}>
                        {debugInfo.cookieInfo?.hasSessionToken ? ' ✓ Present' : ' ✗ Missing'}
                      </span>
                    </p>
                    <p>
                      <strong>Next-Auth Cookie:</strong> 
                      <span className={debugInfo.cookieInfo?.hasNextAuth ? "text-green-600" : "text-red-600"}>
                        {debugInfo.cookieInfo?.hasNextAuth ? ' ✓ Present' : ' ✗ Missing'}
                      </span>
                    </p>
                    <p>
                      <strong>Direct Auth Token:</strong> 
                      <span className={debugInfo.cookieInfo?.hasDirectAuth ? "text-green-600" : "text-gray-400"}>
                        {debugInfo.cookieInfo?.hasDirectAuth ? ' ✓ Present' : ' ◌ Not used'}
                      </span>
                    </p>
                    <p>
                      <strong>Secure Cookies:</strong> 
                      <span className={debugInfo.cookieInfo?.hasSecureCookie ? "text-green-600" : debugInfo.environment?.isProduction ? "text-red-600" : "text-gray-400"}>
                        {debugInfo.cookieInfo?.hasSecureCookie ? ' ✓ Present' : debugInfo.environment?.isProduction ? ' ✗ Missing' : ' ◌ Not needed in dev'}
                      </span>
                    </p>
                  </div>
                  
                  {debugInfo.cookieInfo?.expectedCookieName && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm">
                        <strong>Expected Auth Cookie: </strong> 
                        <code className="bg-white px-1 py-0.5 rounded">{debugInfo.cookieInfo.expectedCookieName}</code>
                        <span className={debugInfo.cookieInfo?.hasExpectedCookie ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                          {debugInfo.cookieInfo?.hasExpectedCookie ? '✓ Found' : '✗ Not Found'}
                        </span>
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <p className="font-semibold mb-1">All Cookies:</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="py-2 px-3 text-left">Name</th>
                            <th className="py-2 px-3 text-left">Value (partial)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debugInfo.cookieInfo?.names.map((name, index) => (
                            <tr key={index} className="border-t border-gray-200">
                              <td className="py-2 px-3 font-mono">{name}</td>
                              <td className="py-2 px-3 font-mono text-gray-600">
                                {debugInfo.cookieInfo?.values?.[name] || '[hidden]'}
                              </td>
                            </tr>
                          ))}
                          {(debugInfo.cookieInfo?.names.length === 0) && (
                            <tr>
                              <td colSpan={2} className="py-2 px-3 text-center text-red-600">No cookies found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Test cookie setting functionality */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <button 
                    onClick={testCookieSetting}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Test Cookie Functionality
                  </button>
                  {testCookieResult && (
                    <p className="mt-2 text-sm italic">{testCookieResult}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* JWT Information */}
            {debugInfo.jwtInfo && (
              <div className="bg-amber-50 p-4 rounded-md">
                <h2 className="font-semibold text-amber-800 mb-2">JWT Token</h2>
                <div className="pl-4 border-l-2 border-amber-200">
                  {debugInfo.jwtInfo.exists ? (
                    <>
                      <p><strong>Status:</strong> <span className="text-green-600">Token found</span></p>
                      <p><strong>Role:</strong> {debugInfo.jwtInfo.role || 'Not set'}</p>
                      <p><strong>Email:</strong> {debugInfo.jwtInfo.email || 'Not set'}</p>
                      <p><strong>Expires:</strong> {debugInfo.jwtInfo.expires || 'Unknown'}</p>
                    </>
                  ) : (
                    <p><strong>Status:</strong> <span className="text-red-600">No valid token found</span></p>
                  )}
                  
                  {debugInfo.jwtInfo.error && (
                    <div className="mt-2 bg-red-100 p-2 rounded">
                      <p className="text-red-700 text-sm">{debugInfo.jwtInfo.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Session Data */}
            {debugInfo.session && (
              <div className="bg-indigo-50 p-4 rounded-md">
                <h2 className="font-semibold text-indigo-800 mb-2">Session Data</h2>
                <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(debugInfo.session, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Navigation options */}
            <div className="flex flex-wrap gap-4 mt-8">
              <button 
                onClick={() => router.push('/admin-bypass')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Emergency Admin Access
              </button>
              
              <button 
                onClick={() => router.push('/secure-access-9b1c3f5d7e')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Normal Login
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Refresh Diagnostics
              </button>
              
              <button 
                onClick={() => router.push('/')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Back to Homepage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
