"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

/**
 * Enhanced Viator Widget Renderer with better error handling and reload capability.
 * 
 * This implementation improves reliability and handles edge cases better.
 */
const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const widgetId = useRef<string>(`widget-${Math.random().toString(36).substring(2, 9)}`);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const attemptCountRef = useRef(0);
  const maxAttempts = 3;

  // Function to load the Viator script
  const loadScript = () => {
    // Clean up any existing script to avoid duplicates
    if (scriptRef.current) {
      document.body.removeChild(scriptRef.current);
      scriptRef.current = null;
    }

    // Create and add the script tag
    const script = document.createElement('script');
    script.src = 'https://www.viator.com/orion/partner/widget.js';
    script.async = true;
    
    // Handle script load success
    script.onload = () => {
      console.log('Viator script loaded successfully');
      setIsLoaded(true);
      setHasError(false);
      
      // Trigger resize events to help widget render correctly
      triggerResizeEvents();
    };
    
    // Handle script load failure
    script.onerror = (e) => {
      console.error('Failed to load Viator script:', e);
      setHasError(true);
      attemptRetryIfNeeded();
    };
    
    document.body.appendChild(script);
    scriptRef.current = script;
  };

  // Schedule resize events with increasing delays
  const triggerResizeEvents = () => {
    // More comprehensive resize scheduling
    [100, 300, 600, 1000, 1500, 2000, 3000, 5000].forEach(delay => {
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.dispatchEvent(new Event('resize'));
        }
      }, delay);
    });
  };

  // Attempt to retry loading if needed
  const attemptRetryIfNeeded = () => {
    if (attemptCountRef.current < maxAttempts) {
      attemptCountRef.current += 1;
      console.log(`Retrying Viator widget load (attempt ${attemptCountRef.current} of ${maxAttempts})...`);
      
      // Exponential backoff for retries
      const backoffDelay = 1000 * Math.pow(2, attemptCountRef.current - 1);
      setTimeout(() => {
        initializeWidget();
      }, backoffDelay);
    }
  };

  // Initialize the widget with error handling
  const initializeWidget = () => {
    if (!containerRef.current || !widgetCode) return;

    try {
      // Clear any previous content and set widget HTML
      containerRef.current.innerHTML = '';
      containerRef.current.innerHTML = widgetCode;
      console.log(`Viator widget inserted with ID: ${widgetId.current}`);
      
      // Load the Viator script
      loadScript();
    } catch (error) {
      console.error("Error initializing Viator widget:", error);
      setHasError(true);
      attemptRetryIfNeeded();
    }
  };

  // Initialize the widget when component mounts or when widgetCode changes
  useEffect(() => {
    initializeWidget();
    
    // Visibility change handler to help with tab switching
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, triggering resize');
        window.dispatchEvent(new Event('resize'));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Ensure cleanup when component unmounts
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current);
      }
    };
  }, [widgetCode]);
  
  return (
    <div className="viator-widget-container">
      <div 
        ref={containerRef}
        className="w-full min-h-[400px]"
        id={widgetId.current}
        style={{
          height: 'auto',
          overflow: 'visible',
          display: 'block',
          visibility: 'visible',
          zIndex: 1,
        }}
      />
      
      {hasError && (
        <div className="p-4 mt-2 text-red-600 bg-red-100 rounded">
          There was an issue loading the tour widget. Please try refreshing the page.
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;
