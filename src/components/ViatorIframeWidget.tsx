"use client";

/**
 * ViatorIframeWidget Component
 * 
 * This component uses an iframe to isolate the Viator widget from React's rendering cycle,
 * ensuring it loads properly even after client-side navigation. This approach bypasses
 * React's virtual DOM completely for the widget content.
 */
import { useEffect, useRef } from 'react';

interface ViatorIframeWidgetProps {
  widgetCode: string;
}

const ViatorIframeWidget: React.FC<ViatorIframeWidgetProps> = ({ widgetCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const uniqueId = `viator-frame-${Math.random().toString(36).substring(2, 11)}`;

  useEffect(() => {
    // Get reference to the iframe
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    // Wait for iframe to load
    const handleLoad = () => {
      try {
        // Generate complete HTML content for the iframe
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Viator Widget</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background: transparent;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }
              </style>
            </head>
            <body>
              ${widgetCode}
              <script async src="https://www.viator.com/orion/partner/widget.js"></script>
              <script>
                // Helper function to resize iframe based on content
                function notifyParent() {
                  const height = document.body.scrollHeight;
                  window.parent.postMessage({ type: 'resize', height: height, id: '${uniqueId}' }, '*');
                }
                
                // Trigger resize events at intervals to ensure widget loads
                setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
                setTimeout(() => { window.dispatchEvent(new Event('resize')); notifyParent(); }, 500);
                setTimeout(() => { window.dispatchEvent(new Event('resize')); notifyParent(); }, 1000);
                setTimeout(() => { window.dispatchEvent(new Event('resize')); notifyParent(); }, 2000);
                
                // Listen for visibility changes
                document.addEventListener('visibilitychange', function() {
                  if (document.visibilityState === 'visible') {
                    window.dispatchEvent(new Event('resize'));
                    notifyParent();
                  }
                });
              </script>
            </body>
          </html>
        `;
        
        // Write the content to the iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
          console.log(`Viator iframe loaded with ID: ${uniqueId}`);
        }
      } catch (err) {
        console.error('Error initializing Viator iframe:', err);
      }
    };
    
    iframe.addEventListener('load', handleLoad);
    
    // Handle messages from iframe for resizing
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize' && event.data?.id === uniqueId) {
        const height = event.data.height;
        if (iframe && height > 100) { // Sanity check on height
          iframe.style.height = `${height}px`;
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('message', handleMessage);
    };
  }, [widgetCode, uniqueId]);
  
  return (
    <iframe
      ref={iframeRef}
      id={uniqueId}
      className="w-full border-0"
      style={{
        height: '500px', // Initial height before content loads
        width: '100%',
        overflow: 'hidden'
      }}
      title="Viator booking widget"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
};

export default ViatorIframeWidget;
