'use client';

/**
 * Global Error Logger Utility
 * 
 * This file provides global error handling for the application.
 * It can be imported and initialized in the root layout or specific pages.
 */

// Function to log errors to console and optionally to a server
export function logError(error: Error | unknown, info?: string): void {
  // Create a timestamp for the error
  const timestamp = new Date().toISOString();
  
  // Get browser information
  const browserInfo = typeof navigator !== 'undefined' 
    ? `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`
    : 'Server-side';
  
  // Format the error for logging
  const errorDetails = {
    timestamp,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    info,
    browserInfo,
  };
  
  // Log to console
  console.error('[Error Logger]', errorDetails);
  
  // Here you could also send the error to a server endpoint
  // Example: fetch('/api/log-error', { method: 'POST', body: JSON.stringify(errorDetails) })
}

// Function to initialize global error listeners
export function initializeErrorListeners(): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for server-side
  }
  
  // Store original handlers to restore later
  const originalOnError = window.onerror;
  const originalOnUnhandledRejection = window.onunhandledrejection;
  
  // Set up global error handler
  window.onerror = function(message, source, lineno, colno, error) {
    logError(error || new Error(String(message)), `${source}:${lineno}:${colno}`);
    
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
  
  // Set up console.error interceptor to capture console errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // First, call the original console.error
    originalConsoleError.apply(this, args);
    
    // Then log it as a captured error if the first argument is an Error
    if (args[0] instanceof Error) {
      logError(args[0], 'Captured from console.error');
    } else if (typeof args[0] === 'string' && args[0].includes('Error')) {
      // Try to handle string errors
      const errorMessage = args.join(' ');
      logError(new Error(errorMessage), 'String error from console.error');
    }
  };
  
  // Return cleanup function
  return () => {
    window.onerror = originalOnError;
    window.onunhandledrejection = originalOnUnhandledRejection;
    console.error = originalConsoleError;
  };
}

// Create a component that will initialize error listeners
export function createGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    const cleanup = initializeErrorListeners();
    
    // Add additional device info logging
    console.info('[Device Info]', {
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      touchEnabled: 'ontouchstart' in window,
      online: navigator.onLine,
    });
    
    // Return cleanup function
    return cleanup;
  }
  
  return () => {}; // No-op for server-side
}

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
  setTimeout(() => {
    createGlobalErrorHandler();
    console.log('[Error Logger] Global error handler initialized');
  }, 0);
}
