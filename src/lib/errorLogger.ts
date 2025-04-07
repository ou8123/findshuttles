'use client';

/**
 * Lightweight Error Logger Utility - Production Optimized
 * 
 * This file provides error handling for the application,
 * with performance optimizations for production builds.
 */

// Only activate full error logging in development
const isDev = process.env.NODE_ENV === 'development';

// Function to log errors with minimal overhead in production
export function logError(error: Error | unknown, info?: string): void {
  if (isDev) {
    // Detailed logging for development only
    const timestamp = new Date().toISOString();
    const browserInfo = typeof navigator !== 'undefined' 
      ? `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`
      : 'Server-side';
    
    const errorDetails = {
      timestamp,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      info,
      browserInfo,
    };
    
    // console.error('[Error Logger]', errorDetails); // Temporarily comment out to prevent logger crash
    // Fallback to simpler logging if the above line causes issues:
    console.log('[Error Caught in Dev]', error instanceof Error ? error.message : String(error), info);

  } else {
    // Minimal logging for production - just the basics
    console.error('[Error]', 
      error instanceof Error ? error.message : String(error),
      info || ''
    );
  }
}

// Function to initialize global error listeners
export function initializeErrorListeners(): () => void {
  // --- Temporarily Disable Global Handlers ---
  console.log("Skipping attachment of custom global error handlers for debugging.");
  const originalOnError = typeof window !== 'undefined' ? window.onerror : null;
  const originalOnUnhandledRejection = typeof window !== 'undefined' ? window.onunhandledrejection : null;
  
  // if (typeof window === 'undefined') {
  //   return () => {}; // No-op for server-side
  // }
  
  // // Store original handlers to restore later
  // const originalOnError = window.onerror;
  // const originalOnUnhandledRejection = window.onunhandledrejection;
  
  // // Set up global error handler - simpler in production
  // window.onerror = function(message, source, lineno, colno, error) {
  //   logError(error || new Error(String(message)), isDev ? `${source}:${lineno}:${colno}` : undefined);
    
  //   // Call original handler if it exists
  //   if (typeof originalOnError === 'function') {
  //     return originalOnError.apply(this, arguments as any);
  //   }
    
  //   return false; // Let the error propagate
  // };
  
  // // Set up unhandled promise rejection handler
  // window.onunhandledrejection = function(event) {
  //   logError(event.reason, 'Unhandled Promise Rejection');
    
  //   // Call original handler if it exists
  //   if (typeof originalOnUnhandledRejection === 'function') {
  //     return originalOnUnhandledRejection.apply(this, arguments as any);
  //   }
  // };
  
  // Only intercept console.error in development
  let originalConsoleError: typeof console.error | undefined; // Keep this for potential restoration logic if needed later
  if (isDev) {
    originalConsoleError = console.error;
    console.error = function(...args) {
      // First, call the original console.error if it exists
      if (originalConsoleError) {
        originalConsoleError.apply(this, args);
      } else {
        // Fallback if original is somehow missing (shouldn't happen in dev)
        console.log("Original console.error missing, logging args:", ...args);
      }
      
      // Only capture actual errors to avoid overhead
      if (args[0] instanceof Error) {
        logError(args[0], 'Captured from console.error');
      }
    };
  }
  
  // Return cleanup function (will restore originals if they existed)
  return () => {
    if (typeof window !== 'undefined') {
       window.onerror = originalOnError;
       window.onunhandledrejection = originalOnUnhandledRejection;
       // console.error restoration is already commented out below
    }
    // if (isDev && originalConsoleError) {
    //   console.error = originalConsoleError;
    // }
  };
}

// Create error handler with minimal overhead in production
export function createGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    // Still call initialize to get the cleanup function, even though handlers aren't attached
    const cleanup = initializeErrorListeners(); 
    
    // Only log device info in development
    if (isDev) {
      console.info('[Device Info]', {
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        pixelRatio: window.devicePixelRatio,
      });
    }
    
    return cleanup;
  }
  
  return () => {}; // No-op for server-side
}

// No auto-initialization to prevent performance impact
