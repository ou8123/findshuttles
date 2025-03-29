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
            html, body {
              margin: 0;
              padding: 0;
              height: auto;
              min-height: 100%;
              font-family: system-ui, -apple-system, sans-serif;
              background: transparent;
              overflow: hidden;
            }
            .widget-container {
              width: 100%;
              height: auto;
              min-height: 400px;
              position: relative;
              display: flex;
              flex-direction: column;
            }
            /* Hide scrollbars but allow scrolling */
            ::-webkit-scrollbar {
              display: none;
            }
            * {
              -ms-overflow-style: none;
              scrollbar-width: none;
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
          <div class="widget-container">
            ${widgetCode}
          </div>
          <script>
            // Function to update iframe height
            function updateHeight() {
              const container = document.querySelector('.widget-container');
              const widgets = document.querySelectorAll('iframe, .viator-widget');
              let maxHeight = 400; // minimum height

              // Check container height
              if (container) {
                maxHeight = Math.max(maxHeight, container.scrollHeight);
              }

              // Check individual widget heights
              widgets.forEach(widget => {
                if (widget.scrollHeight > maxHeight) {
                  maxHeight = widget.scrollHeight;
                }
              });

              // Add some padding to ensure everything is visible
              maxHeight += 20;

              // Send height to parent
              window.parent.postMessage({ type: 'resize', height: maxHeight }, '*');
            }

            // Listen for widget load
            window.addEventListener('load', function() {
              window.parent.postMessage('widget-loaded', '*');
              // Initial height update
              setTimeout(updateHeight, 1000); // Delay to ensure content is loaded
            });

            // Listen for DOM changes
            const observer = new MutationObserver(function(mutations) {
              // Delay height update to ensure content is fully rendered
              setTimeout(updateHeight, 500);
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              characterData: true
            });

            // Listen for widget errors
            window.addEventListener('error', function(e) {
              window.parent.postMessage({ type: 'widget-error', error: e.message }, '*');
            });

            // Listen for resize events
            window.addEventListener('resize', function() {
              // Debounce resize events
              clearTimeout(window.resizeTimer);
              window.resizeTimer = setTimeout(updateHeight, 250);
            });
          </script>
        </body>
      </html>
    `;

    // Set iframe content
    iframe.srcdoc = html;

    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize' && typeof event.data.height === 'number') {
        iframe.style.height = `${event.data.height}px`;
      }
    };

    window.addEventListener('message', handleMessage);

    // Set timeout for loading
    const timeoutDuration = 10000; // 10 seconds
    const timeoutId = setTimeout(() => {
      console.log('Widget load timeout');
    }, timeoutDuration);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
    };
  }, [widgetCode]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ 
        minHeight: '400px',
        height: 'auto',
        overflow: 'hidden'
      }}
      sandbox="allow-scripts allow-popups allow-forms"
      loading="lazy"
    />
  );
};

export default ViatorWidgetRenderer;