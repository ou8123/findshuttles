"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const LOAD_TIMEOUT = 15000;

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let loadTimeout: NodeJS.Timeout;
    let retryTimeout: NodeJS.Timeout;

    const loadWidget = () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Create a new div for the widget
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'viator-widget';
        container.appendChild(widgetContainer);

        // Create a script element for the widget
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;

        // Extract script content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;
        const scriptElement = tempDiv.querySelector('script');

        if (scriptElement) {
          // Copy script attributes
          Array.from(scriptElement.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });

          // Set script content or src
          if (scriptElement.src) {
            script.src = scriptElement.src;
          } else {
            script.textContent = scriptElement.textContent;
          }

          // Add non-script content
          scriptElement.remove();
          widgetContainer.innerHTML = tempDiv.innerHTML;

          // Add load and error handlers
          script.onload = () => {
            console.log('Widget script loaded successfully');
            setIsLoading(false);
            setError(null);
          };

          script.onerror = () => {
            console.error('Widget script failed to load');
            if (retryCount < MAX_RETRIES) {
              console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
              setRetryCount(prev => prev + 1);
              retryTimeout = setTimeout(loadWidget, RETRY_DELAY);
            } else {
              setError('Failed to load widget after multiple attempts');
              setIsLoading(false);
            }
          };

          // Add script to document
          document.head.appendChild(script);

          // Set timeout for overall load
          loadTimeout = setTimeout(() => {
            if (isLoading) {
              setError('Widget took too long to load');
              setIsLoading(false);
            }
          }, LOAD_TIMEOUT);
        } else {
          throw new Error('No script found in widget code');
        }
      } catch (err) {
        console.error('Error loading widget:', err);
        setError('Failed to load widget');
        setIsLoading(false);
      }
    };

    // Start loading with initial delay
    const initTimeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      loadWidget();
    }, 1000);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      clearTimeout(retryTimeout);
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('viator') || script.src.includes('viator')) {
          script.remove();
        }
      });
    };
  }, [widgetCode, isLoading, retryCount]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">
            {retryCount > 0 ? `Loading widget (Attempt ${retryCount + 1}/${MAX_RETRIES})...` : 'Loading booking widget...'}
          </div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`min-h-[300px] transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
      {error && (
        <div className="text-red-500 text-sm mt-2 text-center">
          {error}. Please refresh the page to try again.
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;