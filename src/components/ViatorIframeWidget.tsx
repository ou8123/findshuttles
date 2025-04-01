"use client";

/**
 * ViatorIframeWidget Component
 * 
 * Optimized iframe widget implementation that:
 * - Uses lazy loading for performance
 * - Implements better height management to work with fixed containers
 * - Improves mobile responsiveness
 * - Enhances security with proper sandbox attributes
 * - Provides better error handling and logging
 */
import { useEffect, useRef, useState } from 'react';

interface ViatorIframeWidgetProps {
  widgetCode: string;
}

const ViatorIframeWidget: React.FC<ViatorIframeWidgetProps> = ({ widgetCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const uniqueId = `viator-frame-${Math.random().toString(36).substring(2, 11)}`;

  useEffect(() => {
    // Get reference to the iframe
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    // Wait for iframe to load
    const handleLoad = () => {
      try {
        // Generate complete HTML content for the iframe with improved meta tags
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <title>Viator Widget</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background: transparent;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                  overflow-x: hidden;
                }
                /* Hide scrollbar but allow scrolling */
                body::-webkit-scrollbar { 
                  display: none;
                }
                body {
                  -ms-overflow-style: none;  /* IE and Edge */
                  scrollbar-width: none;  /* Firefox */
                }
                /* Basic responsive styling */
                @media (max-width: 767px) {
                  .viator-widget .vw-pricebanner, .viator-widget .vw-widget {
                    width: 100% !important;
                  }
                }
              </style>
            </head>
            <body>
              ${widgetCode}
              <script async src="https://www.viator.com/orion/partner/widget.js"></script>
              <script>
                // Simplified message handling for parent container
                function notifyParent() {
                  try {
                    const height = document.body.scrollHeight;
                    window.parent.postMessage({ 
                      type: 'viatorWidgetLoaded', 
                      height: height, 
                      id: '${uniqueId}' 
                    }, '*');
                  } catch (err) {
                    console.error('Failed to notify parent window:', err);
                  }
                }
                
                // Set up progressive checks as widget loads
                const checkTimes = [200, 600, 1000, 1500, 2500, 3500];
                checkTimes.forEach(time => {
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                    notifyParent();
                  }, time);
                });
                
                // Listen for visibility changes
                document.addEventListener('visibilitychange', function() {
                  if (document.visibilityState === 'visible') {
                    window.dispatchEvent(new Event('resize'));
                    notifyParent();
                  }
                });
                
                // Detect Viator widget elements once they've loaded
                const checkForWidgetElements = () => {
                  const viatorElements = document.querySelectorAll(
                    '[data-viator-widget], .viator-widget, [data-widget-id], [id^="viator"]'
                  );
                  
                  if (viatorElements.length > 0) {
                    console.log("Viator widget elements found and loaded.");
                    notifyParent();
                    
                    // Watch for changes on these elements
                    if (window.MutationObserver) {
                      const observer = new MutationObserver(() => {
                        notifyParent();
                      });
                      
                      viatorElements.forEach(el => {
                        observer.observe(el, {
                          attributes: true,
                          childList: true,
                          subtree: true
                        });
                      });
                    }
                  }
                };
                
                // Check periodically for Viator elements
                const checkInterval = setInterval(checkForWidgetElements, 500);
                setTimeout(() => clearInterval(checkInterval), 10000); // Stop checking after 10s
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
          console.log(`Viator iframe initialized with ID: ${uniqueId}`);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Error initializing Viator iframe:', err);
      }
    };
    
    iframe.addEventListener('load', handleLoad);
    
    // Handle messages from iframe more simply
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from our iframe (checking uniqueId)
      if (event.data?.type === 'viatorWidgetLoaded' && event.data?.id === uniqueId) {
        // We don't need to manually resize anymore - parent container handles this
        console.log(`Viator widget content loaded and ready, height: ${event.data.height}px`);
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
        height: '100%',
        width: '100%',
        border: 0,
        display: 'block'
      }}
      title="Viator booking widget"
      loading="lazy" // Add lazy loading for performance
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      data-viator-container={uniqueId}
      aria-label="Viator booking options"
    />
  );
};

export default ViatorIframeWidget;
