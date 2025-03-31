'use client';

import React, { useState, useEffect, useRef } from 'react';

// Define error types
interface ErrorLog {
  id: string;
  type: 'error' | 'unhandledrejection' | 'resourceError' | 'consoleError' | 'custom';
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
  stack?: string;
  timestamp: Date;
  browserInfo?: string;
}

interface ErrorLoggerProps {
  maxErrors?: number;
  showControls?: boolean;
}

const ErrorLogger: React.FC<ErrorLoggerProps> = ({
  maxErrors = 20,
  showControls = true,
}) => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const originalConsoleError = useRef<typeof console.error | null>(null);
  
  // Get browser and device information
  const getBrowserInfo = () => {
    return `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`;
  };

  // Generate a unique ID for each error
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  // Add an error to the log
  const addError = (errorLog: Omit<ErrorLog, 'id' | 'timestamp' | 'browserInfo'>) => {
    setErrors(prev => {
      const newErrors = [
        {
          ...errorLog,
          id: generateId(),
          timestamp: new Date(),
          browserInfo: getBrowserInfo(),
        },
        ...prev,
      ].slice(0, maxErrors);
      
      return newErrors;
    });
  };

  // Clear all errors
  const clearErrors = () => {
    setErrors([]);
  };

  // Test error function (for debug purposes)
  const triggerTestError = () => {
    try {
      // @ts-ignore - Intentional error for testing
      const obj = null;
      obj.nonExistentMethod();
    } catch (err) {
      addError({
        type: 'custom',
        message: 'Test error triggered manually',
        error: err as Error,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  };

  // Test promise rejection (for debug purposes)
  const triggerPromiseRejection = () => {
    Promise.reject(new Error('Test promise rejection')).catch(err => {
      // This catch prevents the unhandledrejection event for this specific promise
      console.log('Caught promise rejection locally', err);
    });
    
    // This one will trigger the unhandledrejection event
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Unhandled promise rejection test')), 100);
    });
  };

  // Setup error listeners
  useEffect(() => {
    // Global error handler
    const handleGlobalError = (
      event: ErrorEvent | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      // Prevent duplicate logging for the same error
      if (event.defaultPrevented) {
        return;
      }
      
      if (event instanceof ErrorEvent) {
        addError({
          type: 'error',
          message: event.message || 'Unknown error',
          source: event.filename || source || '',
          lineno: event.lineno || lineno || 0,
          colno: event.colno || colno || 0,
          error: event.error || error,
          stack: event.error?.stack,
        });
      } else {
        // Handle as a generic error
        addError({
          type: 'error',
          message: 'Unknown error occurred',
          source: source || '',
          lineno: lineno || 0,
          colno: colno || 0,
          error: error,
          stack: error?.stack,
        });
      }
    };

    // Unhandled Promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addError({
        type: 'unhandledrejection',
        message: event.reason?.message || 'Unhandled Promise rejection',
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        stack: event.reason?.stack,
      });
    };

    // Resource error handler (for script, css, img, etc. loading failures)
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      const elementType = target.tagName?.toLowerCase() || 'unknown';
      const source = (target as any).src || (target as any).href || 'unknown source';
      
      addError({
        type: 'resourceError',
        message: `Failed to load ${elementType} resource`,
        source: source,
      });
    };

    // Override console.error to capture console errors
    originalConsoleError.current = console.error;
    console.error = (...args) => {
      // Call the original console.error
      if (originalConsoleError.current) {
        originalConsoleError.current.apply(console, args);
      }
      
      // Add to our error log
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      addError({
        type: 'consoleError',
        message: errorMessage,
      });
    };

    // Add event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Resource error listeners
    document.addEventListener('error', handleResourceError, true); // Capture phase

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('error', handleResourceError, true);
      
      // Restore original console.error
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
    };
  }, [maxErrors]);

  // Filter the errors based on the selected type
  const filteredErrors = filterType === 'all' 
    ? errors 
    : errors.filter(err => err.type === filterType);

  // Create a text version of all errors for copying
  const getErrorText = () => {
    return filteredErrors.map(err => `
[${err.timestamp.toLocaleString()}] ${err.type.toUpperCase()}: ${err.message}
${err.source ? `Source: ${err.source}` : ''}${err.lineno ? ` Line: ${err.lineno}, Col: ${err.colno}` : ''}
${err.stack ? `Stack: ${err.stack}` : ''}
Browser: ${err.browserInfo}
-------------------`).join('\n');
  };

  // Copy errors to clipboard
  const copyErrorsToClipboard = () => {
    const text = getErrorText();
    navigator.clipboard.writeText(text).then(
      () => {
        alert('Errors copied to clipboard');
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  return (
    <div className="error-logger bg-white border border-red-300 rounded-lg shadow-md max-w-full">
      <div 
        className="error-logger-header flex justify-between items-center px-4 py-2 bg-red-50 border-b border-red-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-red-700 font-medium flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Error Logger {errors.length > 0 && `(${errors.length})`}
        </h3>
        <span className="text-gray-500">
          {isExpanded ? '▼' : '►'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="error-logger-content p-4">
          {showControls && (
            <div className="error-controls flex flex-wrap justify-between items-center mb-4 gap-2">
              <div className="filter-controls">
                <select 
                  className="border rounded p-1 text-sm" 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Errors</option>
                  <option value="error">JavaScript Errors</option>
                  <option value="unhandledrejection">Promise Rejections</option>
                  <option value="resourceError">Resource Errors</option>
                  <option value="consoleError">Console Errors</option>
                  <option value="custom">Custom Errors</option>
                </select>
              </div>
              
              <div className="action-buttons flex gap-2">
                <button 
                  onClick={triggerTestError} 
                  className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded text-xs"
                >
                  Test Error
                </button>
                <button 
                  onClick={triggerPromiseRejection} 
                  className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded text-xs"
                >
                  Test Rejection
                </button>
                <button 
                  onClick={copyErrorsToClipboard} 
                  className="bg-blue-100 border border-blue-400 text-blue-700 px-2 py-1 rounded text-xs"
                >
                  Copy All
                </button>
                <button 
                  onClick={clearErrors} 
                  className="bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded text-xs"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
          
          <div className="errors-list max-h-80 overflow-y-auto border rounded border-gray-200">
            {filteredErrors.length === 0 ? (
              <div className="p-4 text-gray-500 text-center italic">
                No errors logged yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredErrors.map((err) => (
                  <li key={err.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-1">
                        {err.type === 'error' && (
                          <span className="text-red-500">●</span>
                        )}
                        {err.type === 'unhandledrejection' && (
                          <span className="text-purple-500">●</span>
                        )}
                        {err.type === 'resourceError' && (
                          <span className="text-orange-500">●</span>
                        )}
                        {err.type === 'consoleError' && (
                          <span className="text-blue-500">●</span>
                        )}
                        {err.type === 'custom' && (
                          <span className="text-gray-500">●</span>
                        )}
                      </div>
                      <div className="ml-2 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          [{err.timestamp.toLocaleTimeString()}] {err.type}
                        </div>
                        <div className="text-sm text-gray-700 break-words">
                          {err.message}
                        </div>
                        {err.source && (
                          <div className="text-xs text-gray-500 mt-1">
                            Source: {err.source}
                            {err.lineno && ` (Line: ${err.lineno}, Col: ${err.colno})`}
                          </div>
                        )}
                        {err.stack && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              Stack Trace
                            </summary>
                            <pre className="text-xs bg-gray-100 p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
                              {err.stack}
                            </pre>
                          </details>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {err.browserInfo}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorLogger;
