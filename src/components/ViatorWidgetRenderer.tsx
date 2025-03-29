"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!widgetCode) return;

    const setupWidget = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      try {
        // Create a minimal HTML document with necessary styles
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
                  min-height: 300px;
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

        // Write the HTML to the iframe
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }

      } catch (err) {
        console.error('Error setting up widget:', err);
        setError('Failed to load widget');
        setIsLoading(false);
      }
    };

    // Handle messages from iframe
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
    setupWidget();

    // Set a timeout for loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError('Widget took too long to load');
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [widgetCode, isLoading]);

  return (
    <div className="viator-widget-container mt-2">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className={`w-full min-h-[300px] border-0 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ transition: 'opacity 0.3s ease-in-out' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
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