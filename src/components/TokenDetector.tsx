'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNetlifyAuth } from '@/lib/netlify-auth-context';

/**
 * TokenDetector component
 * 
 * This component runs on every page and checks for Netlify Identity tokens
 * in the URL hash. If it finds a token, it either handles it directly or
 * redirects to the identity-callback page.
 */
export default function TokenDetector() {
  const router = useRouter();
  const { handleInviteToken } = useNetlifyAuth();
  
  useEffect(() => {
    // Run only in the browser
    if (typeof window === 'undefined') return;
    
    // Check for identity tokens in URL
    const hash = window.location.hash;
    const isIdentityToken = 
      hash.includes('invite_token=') || 
      hash.includes('confirmation_token=') || 
      hash.includes('recovery_token=');
    
    // Current path - don't redirect if already on identity-callback
    const currentPath = window.location.pathname;
    const isIdentityCallbackPage = currentPath === '/identity-callback';
    
    // Debug - log to console for debugging purposes
    console.log('[TokenDetector] URL hash check:', { 
      hash, 
      isIdentityToken, 
      currentPath,
      isIdentityCallbackPage
    });
    
    if (isIdentityToken && !isIdentityCallbackPage) {
      console.log('[TokenDetector] Identity token detected, redirecting to handler');
      
      // Option 1: Direct handling (works for invite tokens)
      if (hash.includes('invite_token=')) {
        const token = hash.match(/invite_token=([^&]+)/)?.[1];
        if (token) {
          console.log('[TokenDetector] Processing invitation token:', token);
          // Try to handle the token directly first
          try {
            handleInviteToken(token);
            return;
          } catch (err) {
            console.error('[TokenDetector] Failed to handle token directly:', err);
            // Fall through to redirect option
          }
        }
      }
      
      // Option 2: Redirect to identity-callback
      const callbackUrl = `/identity-callback${hash}`;
      console.log('[TokenDetector] Redirecting to:', callbackUrl);
      
      // Use location.replace to preserve the hash in the URL
      // Next.js router doesn't handle hashes properly
      window.location.href = callbackUrl;
    }
  }, [router, handleInviteToken]);
  
  // This component doesn't render anything
  return null;
}
