'use client';

// Export dynamic to disable static generation for this page
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNetlifyAuth } from '@/lib/netlify-auth-context';

export default function IdentityCallbackPage() {
  const { user, isLoading } = useNetlifyAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your request...');
  const router = useRouter();

  // If user is authenticated and done loading, redirect to admin
  useEffect(() => {
    if (!isLoading && user) {
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    }
  }, [user, isLoading, router]);
  
  const { handleInviteToken } = useNetlifyAuth(); // Access this at the component level
  
  // Process tokens on component mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Handle invitation tokens
      if (window.location.hash && window.location.hash.includes('invite_token=')) {
        const token = window.location.hash.match(/invite_token=([^&]+)/)?.[1];
        
        if (token) {
          setMessage('Processing your invitation...');
          console.log('Processing invitation token');
          
          // Now we can safely call this method since we have it from the hook
          handleInviteToken(token);
          
          setStatus('success');
          setMessage('Invitation accepted. Setting up your account...');
        } else {
          setStatus('error');
          setMessage('Invalid invitation token. Please request a new invitation.');
        }
      } 
      // Handle confirmation tokens (email verification, etc.)
      else if (window.location.hash && window.location.hash.includes('confirmation_token=')) {
        setMessage('Confirming your account...');
        setStatus('success');
        setMessage('Account confirmed successfully!');
      }
      // Handle recovery tokens (password reset)
      else if (window.location.hash && window.location.hash.includes('recovery_token=')) {
        setMessage('Processing password reset...');
        setStatus('success');
        setMessage('You can now reset your password.');
      }
      // No tokens found - just redirect to home
      else {
        // Redirect to homepage after a delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing identity callback:', error);
      setStatus('error');
      setMessage('An error occurred processing your request. Please try again or contact support.');
    }
  }, [router, handleInviteToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mb-6">
          {status === 'processing' && (
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          )}
          
          {status === 'success' && (
            <svg className="h-12 w-12 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          
          {status === 'error' && (
            <svg className="h-12 w-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h1 className="text-xl font-semibold mb-2">Identity Verification</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        
        {status === 'error' && (
          <div className="mt-4">
            <button 
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to login page
            </button>
          </div>
        )}
        
        {status === 'success' && user && (
          <p className="text-sm text-gray-500 mt-6">
            Welcome, {user.email}! Redirecting you to the admin area...
          </p>
        )}
        
        {status === 'success' && !user && (
          <p className="text-sm text-gray-500 mt-6">
            Please complete the process to access your account.
          </p>
        )}
      </div>
    </div>
  );
}
