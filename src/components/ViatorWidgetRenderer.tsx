"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let loadTimeout: NodeJS.Timeout;

    const loadWidgetDirect = () => {
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

        // Add scripts to head
        scripts.forEach(oldScript => {
          const script = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });
          script.textContent = oldScript.textContent;
          document.head.appendChild(script);
        });

        // Hide loading after delay
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);
      } catch (error) {
        console.error('Error in direct loading:', error);
        setUseFallback(true);
      }
    };

    const loadWidgetFallback = () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Create an iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '400px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';

        // Create HTML content
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { margin: 0; padding: 0; }
                .widget-container { min-height: 400px; width: 100%; }
              </style>
            </head>
            <body>
              <div class="widget-container">${widgetCode}</div>
            </body>
          </html>
        `;

        // Set iframe content
        container.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }

        // Hide loading after delay
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);
      } catch (error) {
        console.error('Error in fallback loading:', error);
        setIsLoading(false);
      }
    };

    // Start loading with delay
    loadTimeout = setTimeout(() => {
      if (useFallback) {
        loadWidgetFallback();
      } else {
        loadWidgetDirect();
      }
    }, 2000);

    // Cleanup function
    return () => {
      clearTimeout(loadTimeout);
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      if (!useFallback) {
        document.querySelectorAll('script').forEach(script => {
          if (script.textContent?.includes('viator')) {
            script.remove();
          }
        });
      }
    };
  }, [widgetCode, useFallback]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">
            {useFallback ? 'Trying alternative loading method...' : 'Loading booking widget...'}
          </div>
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