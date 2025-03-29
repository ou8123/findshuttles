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
    let checkInterval: NodeJS.Timeout;

    const loadWidget = async () => {
      try {
        // Clear any existing content
        container.innerHTML = '';

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts and non-script content
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content to container
        container.innerHTML = tempDiv.innerHTML;

        // Function to load a script
        const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');

            // Copy script attributes
            Array.from(scriptElement.attributes).forEach(attr => {
              script.setAttribute(attr.name, attr.value);
            });

            // Set script content or src
            if (scriptElement.src) {
              script.src = scriptElement.src;
              script.async = true;
            } else {
              script.textContent = scriptElement.textContent;
            }

            // Handle load events
            script.onload = () => resolve();
            script.onerror = () => reject();

            // Add to document
            document.head.appendChild(script);
          });
        };

        // Load scripts sequentially
        for (const script of scripts) {
          await loadScript(script);
          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Check for widget initialization
        checkInterval = setInterval(() => {
          const widgetElement = container.querySelector('.viator-embedded');
          if (widgetElement) {
            clearInterval(checkInterval);
            setIsLoading(false);
            setError(null);
          }
        }, 500);

        // Set timeout for widget load
        loadTimeout = setTimeout(() => {
          clearInterval(checkInterval);
          if (isLoading) {
            setError('Widget took too long to load');
            setIsLoading(false);
          }
        }, 10000);

      } catch (err) {
        console.error('Error loading widget:', err);
        setError('Failed to load widget');
        setIsLoading(false);
      }
    };

    // Start loading with a delay
    const initTimeout = setTimeout(() => {
      loadWidget();
    }, 1000);

    // Cleanup function
    return () => {
      clearTimeout(loadTimeout);
      clearTimeout(initTimeout);
      clearInterval(checkInterval);
      container.innerHTML = '';
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