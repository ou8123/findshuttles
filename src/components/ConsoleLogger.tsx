'use client';

import { useEffect } from 'react';

/**
 * A simple client component that only logs to the console.
 * This is used to verify that browser console logging is working.
 */
export default function ConsoleLogger() {
  // Direct log to show component loaded
  console.log('[ConsoleLogger] Component loaded');
  
  useEffect(() => {
    // Log in useEffect to ensure client-side execution
    console.log('[ConsoleLogger] useEffect executed');
    
    // Trigger an error to test error catching
    try {
      // Intentionally cause an error
      const testError = new Error('Intentional test error from ConsoleLogger');
      console.error('Test error logging:', testError);
    } catch (err) {
      console.error('Caught error:', err);
    }
    
    return () => {
      console.log('[ConsoleLogger] cleanup');
    };
  }, []);
  
  // Render nothing
  return null;
}
