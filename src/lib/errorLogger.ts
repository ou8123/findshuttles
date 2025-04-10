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
    
    // Restore detailed error logging
    console.error('[Error Logger]', errorDetails);

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
  if (typeof window === 'undefined') {
    return () => {}; // No-op for server-side
  }
  
  // Store original handlers to restore later
  const originalOnError = window.onerror;
  const originalOnUnhandledRejection = window.onunhandledrejection;
  
  // Set up global error handler - simpler in production
  window.onerror = function(message, source, lineno, colno, error) {
    logError(error || new Error(String(message)), isDev ? `${source}:${lineno}:${colno}` : undefined);
    
    // Call original handler if it exists
    if (typeof originalOnError === 'function') {
      return originalOnError.apply(this, arguments as any);
    }
    
    return false; // Let the error propagate
  };
  
  // Set up unhandled promise rejection handler
  window.onunhandledrejection = function(event) {
    logError(event.reason, 'Unhandled Promise Rejection');
    
    // Call original handler if it exists
    if (typeof originalOnUnhandledRejection === 'function') {
      return originalOnUnhandledRejection.apply(this, arguments as any);
    }
  };
  
  // We'll skip console.error interception as it may be causing issues
  // This comment serves as a placeholder to know what was removed
  let originalConsoleError: typeof console.error | undefined = console.error;
  
  // Return cleanup function (will restore originals if they existed)
  return () => {
    if (typeof window !== 'undefined') {
       window.onerror = originalOnError;
       window.onunhandledrejection = originalOnUnhandledRejection;
    }
  };
}

// Create error handler with minimal overhead in production
export function createGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    // Still call initialize to get the cleanup function, even though handlers aren't attached
    const cleanup = initializeErrorListeners(); 
    
    // Test log removed
    
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
