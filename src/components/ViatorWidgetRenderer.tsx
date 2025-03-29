"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !widgetCode) return;

    const iframe = iframeRef.current;

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

    // Set iframe content
    iframe.srcdoc = html;

    // Set timeout for loading
    const timeoutDuration = 10000; // 10 seconds
    const timeoutId = setTimeout(() => {
      console.log('Widget load timeout');
    }, timeoutDuration);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, [widgetCode]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full min-h-[400px] border-0"
      sandbox="allow-scripts allow-popups allow-forms"
      loading="lazy"
    />
  );
};

export default ViatorWidgetRenderer;