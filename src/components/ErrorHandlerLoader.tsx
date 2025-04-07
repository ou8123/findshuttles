'use client';

import { useEffect } from 'react';
import { createGlobalErrorHandler } from '@/lib/errorLogger';

// This component loads the global error handler
// It should be included in the root layout
export default function ErrorHandlerLoader() {
  useEffect(() => {
    // --- Temporarily Disable Error Handler Initialization ---
    console.log("Skipping createGlobalErrorHandler call for debugging.");
    // const cleanup = createGlobalErrorHandler(); 
    const cleanup = () => {}; // No-op cleanup
    // --- End Temporary Disable ---
    
    // Clean up on unmount
    return () => {
      cleanup();
    };
  }, []);
  
  // The component doesn't render anything
  return null;
}
