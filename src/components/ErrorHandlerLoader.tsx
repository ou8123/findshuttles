'use client';

import { useEffect } from 'react';
import { createGlobalErrorHandler } from '@/lib/errorLogger';

// This component loads the global error handler
// It should be included in the root layout
export default function ErrorHandlerLoader() {
  useEffect(() => {
    // Initialize the error handler on mount
    const cleanup = createGlobalErrorHandler();
    
    // Clean up on unmount
    return () => {
      cleanup();
    };
  }, []);
  
  // The component doesn't render anything
  return null;
}
