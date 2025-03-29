"use client";

import { useEffect, useRef, useState } from 'react';
import { loadScripts, injectInlineScript } from '@/lib/scriptLoader';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasViator, setHasViator] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let checkInterval: NodeJS.Timeout;
    let loadTimeout: NodeJS.Timeout;

    const initWidget = async () => {
      try {
        // Parse widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        const externalScripts = scripts.filter(script => script.src).map(script => script.src);
        const inlineScripts = scripts.filter(script => !script.src);

        // Remove scripts from content
        scripts.forEach(script => script.remove());

        // Add non-script content to container
        container.innerHTML = tempDiv.innerHTML;

        // Load external scripts first
        if (externalScripts.length > 0) {
          await loadScripts(externalScripts);
        }

        // Then inject inline scripts
        inlineScripts.forEach(script => {
          if (script.textContent) {
            injectInlineScript(script.textContent);
          }
        });

        // Start checking for Viator object
        checkInterval = setInterval(() => {
          if ((window as any).viator) {
            clearInterval(checkInterval);
            setHasViator(true);
            setIsLoading(false);
            setError(null);
          }
        }, 500);

        // Set timeout for widget load
        loadTimeout = setTimeout(() => {
          clearInterval(checkInterval);
          if (!hasViator) {
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
      setIsLoading(true);
      setError(null);
      initWidget();
    }, 1000);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      clearInterval(checkInterval);
      if (container) {
        container.innerHTML = '';
      }
      setHasViator(false);
    };
  }, [widgetCode, hasViator]);

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