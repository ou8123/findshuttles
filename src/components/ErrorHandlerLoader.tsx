'use client';

import { useEffect } from 'react';
import { createGlobalErrorHandler } from '@/lib/errorLogger'; // Restore dependency

// This component loads the global error handler
// It should be included in the root layout
export default function ErrorHandlerLoader() {
  // Add a direct console log outside of useEffect to ensure it runs
  if (typeof window !== 'undefined') {
    console.log('[ErrorHandlerLoader] Component loaded on client');
  }
  
  useEffect(() => {
    // Initialize the global error handler
    const cleanup = createGlobalErrorHandler(); 
    
    // Try to trigger a direct console log to test
    console.log('[ErrorHandlerLoader] useEffect executed');
    
    // Clean up on unmount
    return () => {
      cleanup();
    };
  }, []);
  
  // The component doesn't render anything
  return null;
}
