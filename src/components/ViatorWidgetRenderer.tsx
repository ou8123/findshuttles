"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let loadTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;

    // Function to load a script and return a promise
    const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        
        // Copy attributes
        Array.from(scriptElement.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });

        // Set content
        if (scriptElement.src) {
          script.src = scriptElement.src;
          script.async = false; // Load scripts in order
          script.onload = () => resolve();
          script.onerror = () => reject();
        } else {
          script.textContent = scriptElement.textContent;
          resolve();
        }

        // Add to document
        document.head.appendChild(script);
      });
    };

    // Function to load widget with retry
    const loadWidget = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Parse widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Load scripts sequentially
        for (const script of scripts) {
          await loadScript(script);
          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Check for widget initialization
        const checkWidget = setInterval(() => {
          if ((window as any).viator) {
            clearInterval(checkWidget);
            setIsLoading(false);
            setError(null);
          }
        }, 500);

        // Set timeout for widget check
        loadTimeout = setTimeout(() => {
          clearInterval(checkWidget);
          if (isLoading && retryCount < maxRetries) {
            console.log(`Attempt ${retryCount + 1} failed, retrying...`);
            retryCount++;
            loadWidget();
          } else if (isLoading) {
            setError('Widget took too long to load');
            setIsLoading(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Error loading widget:', error);
        if (retryCount < maxRetries) {
          console.log(`Attempt ${retryCount + 1} failed, retrying...`);
          retryCount++;
          loadWidget();
        } else {
          setError('Failed to load widget');
          setIsLoading(false);
        }
      }
    };

    // Start loading with delay
    const initTimeout = setTimeout(loadWidget, 1000);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('viator')) {
          script.remove();
        }
      });
      setIsLoading(true);
      setError(null);
    };
  }, [widgetCode, isLoading]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`min-h-[400px] transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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