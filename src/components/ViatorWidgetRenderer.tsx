"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let loadTimeout: NodeJS.Timeout;

    const loadWidget = async () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Function to load a script
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
              script.async = true;
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

        // Load scripts sequentially
        for (const script of scripts) {
          try {
            await loadScript(script);
            // Add a small delay between scripts
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error('Error loading script:', error);
          }
        }

        // Hide loading after delay
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);

      } catch (error) {
        console.error('Error loading widget:', error);
        setIsLoading(false);
      }
    };

    // Start loading with delay
    loadTimeout = setTimeout(() => {
      loadWidget();
    }, 2000);

    // Cleanup function
    return () => {
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
    </div>
  );
};

export default ViatorWidgetRenderer;