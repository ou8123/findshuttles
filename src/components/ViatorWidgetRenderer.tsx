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

    // Function to load widget
    const loadWidget = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create a blob URL for the widget code
        const blob = new Blob([widgetCode], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        // Load widget code as a module
        const response = await fetch(blobUrl);
        const html = await response.text();

        // Parse widget code
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract scripts
        const scripts = Array.from(doc.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = doc.body.innerHTML;

        // Load scripts
        for (const script of scripts) {
          const newScript = document.createElement('script');
          
          // Copy attributes
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });

          // Set content
          if (script.src) {
            newScript.src = script.src;
            await new Promise((resolve, reject) => {
              newScript.onload = resolve;
              newScript.onerror = reject;
              document.head.appendChild(newScript);
            });
          } else {
            newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
          }

          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);

        // Hide loading after a delay
        loadTimeout = setTimeout(() => {
          setIsLoading(false);
        }, 2000);

      } catch (error) {
        console.error('Error loading widget:', error);
        setError('Failed to load widget');
        setIsLoading(false);
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
  }, [widgetCode]);

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