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

    const loadWidget = () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Create a complete HTML document for the iframe
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .widget-container {
                  min-height: 400px;
                  width: 100%;
                }
              </style>
            </head>
            <body>
              <div class="widget-container">
                ${widgetCode}
              </div>
              <script>
                // Listen for widget load
                window.addEventListener('load', function() {
                  // Send message to parent when loaded
                  window.parent.postMessage('widget-loaded', '*');
                });

                // Listen for widget errors
                window.addEventListener('error', function(e) {
                  // Send error to parent
                  window.parent.postMessage({ type: 'widget-error', error: e.message }, '*');
                });
              </script>
            </body>
          </html>
        `;

        // Create iframe with data URL
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '400px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups');

        // Convert HTML to data URL
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        iframe.src = dataUrl;

        // Add iframe to container
        container.appendChild(iframe);

        // Listen for messages from iframe
        const handleMessage = (event: MessageEvent) => {
          if (event.data === 'widget-loaded') {
            setIsLoading(false);
            setError(null);
          } else if (event.data?.type === 'widget-error') {
            console.error('Widget error:', event.data.error);
            setError('Widget failed to load');
            setIsLoading(false);
          }
        };

        window.addEventListener('message', handleMessage);

        // Set timeout for load
        loadTimeout = setTimeout(() => {
          if (isLoading) {
            setError('Widget took too long to load');
            setIsLoading(false);
          }
        }, 10000);

        // Return cleanup function
        return () => {
          window.removeEventListener('message', handleMessage);
        };
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
      if (container) {
        container.innerHTML = '';
      }
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