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
    if (!iframeRef.current || !widgetCode) return;

    const iframe = iframeRef.current;
    let loadTimeout: NodeJS.Timeout;

    // Create a complete HTML document
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
              background: transparent;
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
              window.parent.postMessage('widget-loaded', '*');
            });

            // Listen for widget errors
            window.addEventListener('error', function(e) {
              window.parent.postMessage({ type: 'widget-error', error: e.message }, '*');
            });
          </script>
        </body>
      </html>
    `;

    // Handle messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'widget-loaded') {
        setIsLoading(false);
        setError(null);
      } else if (event.data?.type === 'widget-error') {
        console.error('Widget error:', event.data.error);
        setError('Failed to load booking widget');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Set iframe content
    iframe.srcdoc = html;

    // Set timeout for loading
    loadTimeout = setTimeout(() => {
      if (isLoading) {
        setError('Widget took too long to load');
        setIsLoading(false);
      }
    }, 10000);

    // Cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(loadTimeout);
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
      <iframe
        ref={iframeRef}
        className={`w-full min-h-[400px] border-0 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        sandbox="allow-scripts allow-popups allow-forms"
        loading="lazy"
      />
      {error && (
        <div className="mt-2 text-center text-red-500">
          {error}. Please refresh the page to try again.
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;