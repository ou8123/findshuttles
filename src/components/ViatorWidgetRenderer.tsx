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

    // Create blob URL
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    // Set iframe src
    iframe.src = blobUrl;

    // Cleanup function
    return () => {
      URL.revokeObjectURL(blobUrl);
      iframe.src = 'about:blank';
    };
  }, [widgetCode]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full min-h-[400px] border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
};

export default ViatorWidgetRenderer;