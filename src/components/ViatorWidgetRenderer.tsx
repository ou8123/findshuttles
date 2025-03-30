"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

/**
 * Simplified Viator Widget Renderer
 * 
 * This straightforward implementation focuses on reliability across different environments
 * and eliminates spacing issues in the layout.
 */
const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Create a unique widget ID to avoid collisions
  const widgetId = useRef<string>(`widget-${Math.random().toString(36).substring(2, 9)}`);
  
  // Basic initialization function
  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;
    
    try {
      // Clear any previous content
      containerRef.current.innerHTML = '';
      
      // Insert the widget HTML
      containerRef.current.innerHTML = widgetCode;
      
      // Create a script element to load the Viator widget script
      const script = document.createElement('script');
      script.src = 'https://www.viator.com/orion/partner/widget.js';
      script.async = true;
      
      // Handle script load successfully
      script.onload = () => {
        console.log('Viator widget script loaded successfully');
        setIsLoaded(true);
        
        // Trigger resize events to help widget render correctly
        triggerResizeEvents();
        
        // Check for iframe and apply styles if needed
        setTimeout(adjustIframeStyles, 800);
      };
      
      // Handle script load failure
      script.onerror = () => {
        console.error('Failed to load Viator widget script');
        setHasError(true);
      };
      
      // Add script to document body
      document.body.appendChild(script);
      
      // Cleanup function
      return () => {
        try {
          // Only remove if it's still in the document
          if (script && script.parentNode) {
            script.parentNode.removeChild(script);
          }
        } catch (e) {
          console.warn('Error cleaning up Viator script:', e);
        }
      };
    } catch (error) {
      console.error('Error initializing Viator widget:', error);
      setHasError(true);
    }
  }, [widgetCode]);
  
  // Function to adjust iframe styles after it's created
  const adjustIframeStyles = () => {
    if (!containerRef.current) return;
    
    const iframe = containerRef.current.querySelector('iframe');
    if (iframe) {
      // Remove any margins or spacing that could cause gaps
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.marginBottom = '0';
    }
  };
  
  // Schedule multiple resize events to ensure proper widget rendering
  const triggerResizeEvents = () => {
    // Trigger initial resize
    window.dispatchEvent(new Event('resize'));
    
    // Schedule more resize events at different intervals
    [200, 500, 1000, 2000, 3000].forEach(delay => {
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.dispatchEvent(new Event('resize'));
          adjustIframeStyles();
        }
      }, delay);
    });
  };
  
  // Handle visibility changes to help with tab switching
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerResizeEvents();
        adjustIframeStyles();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', adjustIframeStyles);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', adjustIframeStyles);
    };
  }, []);
  
  return (
    <div className="viator-widget-container" style={{ margin: 0, padding: 0 }}>
      <div 
        ref={containerRef}
        className="w-full min-h-[400px] mb-0 pb-0"
        id={widgetId.current}
        style={{
          height: 'auto',
          overflow: 'visible',
          display: 'block',
          visibility: 'visible',
          margin: 0,
          padding: 0,
          border: 0,
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
