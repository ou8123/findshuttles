"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const loadWidget = async () => {
      try {
        const container = containerRef.current;
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '';

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Find all script tags
        const scripts = tempDiv.getElementsByTagName('script');
        const scriptElements = Array.from(scripts);

        // Remove scripts from the temp div
        scriptElements.forEach(script => script.remove());

        // Set the HTML content first (without scripts)
        container.innerHTML = tempDiv.innerHTML;

        // Function to load a script
        const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');

            // Copy all attributes
            Array.from(scriptElement.attributes).forEach(attr => {
              script.setAttribute(attr.name, attr.value);
            });

            // Handle external scripts
            if (scriptElement.src) {
              script.onload = () => resolve();
              script.onerror = () => reject();
            }

            // Copy inline script content
            if (scriptElement.textContent) {
              script.textContent = scriptElement.textContent;
            }

            // For inline scripts, resolve immediately
            if (!scriptElement.src) {
              script.onload = () => resolve();
            }

            // Add to document
            document.head.appendChild(script);
          });
        };

        // Load scripts sequentially
        for (const script of scriptElements) {
          try {
            await loadScript(script);
            // Add a longer delay between scripts on mobile
            if (isMobile) {
              await new Promise(resolve => setTimeout(resolve, 300));
            } else {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error('Error loading script:', error);
            // On mobile, retry once after a delay if script fails
            if (isMobile) {
              await new Promise(resolve => setTimeout(resolve, 500));
              try {
                await loadScript(script);
              } catch (retryError) {
                console.error('Retry failed:', retryError);
              }
            }
          }
        }

        // On mobile, add a final delay and trigger a resize event
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 500));
          window.dispatchEvent(new Event('resize'));
        }
      } catch (error) {
        console.error('Error loading widget:', error);
      }
    };

    // Add a longer initial delay on mobile
    const initialDelay = isMobile ? 1000 : 500;
    const timer = setTimeout(loadWidget, initialDelay);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode, isMobile]);

  return (
    <div 
      ref={containerRef}
      className="w-full min-h-[400px]"
      style={{ 
        height: 'auto',
        overflow: 'visible'
      }}
    />
  );
};

export default ViatorWidgetRenderer;