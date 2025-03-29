"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(400);

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
            html, body {
              margin: 0;
              padding: 0;
              height: auto;
              min-height: 100%;
              font-family: system-ui, -apple-system, sans-serif;
              background: transparent;
            }
            #widget-container {
              width: 100%;
              height: auto;
              min-height: 400px;
              position: relative;
            }
            /* Ensure Viator widget content is fully visible */
            iframe, .viator-widget {
              width: 100% !important;
              height: auto !important;
              min-height: 400px !important;
            }
          </style>
        </head>
        <body>
          <div id="widget-container">
            ${widgetCode}
          </div>
          <script>
            // Function to update iframe height
            function updateHeight() {
              const container = document.getElementById('widget-container');
              const widgets = document.querySelectorAll('iframe, .viator-widget');
              let maxHeight = 400;

              // Get all elements in the document
              const allElements = document.getElementsByTagName('*');
              for (let element of allElements) {
                const rect = element.getBoundingClientRect();
                if (rect.bottom > maxHeight) {
                  maxHeight = Math.ceil(rect.bottom);
                }
              }

              // Add padding
              maxHeight += 20;

              // Send height to parent
              window.parent.postMessage({ type: 'setHeight', height: maxHeight }, '*');
            }

            // Initial height update
            setTimeout(updateHeight, 1000);

            // Update height when content changes
            const observer = new ResizeObserver(() => {
              setTimeout(updateHeight, 100);
            });

            // Observe the widget container and any dynamically added content
            observer.observe(document.body);

            // Listen for dynamic content changes
            new MutationObserver(() => {
              setTimeout(updateHeight, 100);
            }).observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              characterData: true
            });

            // Listen for load events on all iframes and images
            document.addEventListener('load', function(e) {
              if (e.target.tagName === 'IFRAME' || e.target.tagName === 'IMG') {
                setTimeout(updateHeight, 100);
              }
            }, true);

            // Listen for window resize
            window.addEventListener('resize', function() {
              setTimeout(updateHeight, 100);
            });

            // Listen for any errors
            window.addEventListener('error', function(e) {
              window.parent.postMessage({ type: 'error', message: e.message }, '*');
            });
          </script>
        </body>
      </html>
    `;

    // Set iframe content
    iframe.srcdoc = html;

    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'setHeight' && typeof event.data.height === 'number') {
        setHeight(event.data.height);
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [widgetCode]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ 
        height: `${height}px`,
        minHeight: '400px'
      }}
      sandbox="allow-scripts allow-popups allow-forms"
      loading="lazy"
    />
  );
};

export default ViatorWidgetRenderer;