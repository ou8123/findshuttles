"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let observer: MutationObserver | null = null;

    const initWidget = () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Create mutation observer to watch for widget initialization
        observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // Check if any added nodes are the widget's iframe or container
              const hasWidget = Array.from(mutation.addedNodes).some(node => {
                if (node instanceof HTMLElement) {
                  return node.classList.contains('viator-embedded') ||
                         node.tagName.toLowerCase() === 'iframe';
                }
                return false;
              });

              if (hasWidget) {
                // Widget has been added, now add scripts
                scripts.forEach((oldScript, index) => {
                  setTimeout(() => {
                    const script = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                      script.setAttribute(attr.name, attr.value);
                    });
                    script.textContent = oldScript.textContent;
                    document.head.appendChild(script);
                  }, index * 500); // 500ms delay between scripts
                });

                // Stop observing
                observer?.disconnect();
              }
            }
          }
        });

        // Start observing
        observer.observe(container, {
          childList: true,
          subtree: true
        });

      } catch (error) {
        console.error('Error initializing widget:', error);
        observer?.disconnect();
      }
    };

    // Start with a delay
    const initTimeout = setTimeout(initWidget, 2000);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      observer?.disconnect();
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('viator')) {
          script.remove();
        }
      });
    };
  }, [widgetCode]);

  return (
    <div 
      ref={containerRef}
      className="min-h-[400px]"
    />
  );
};

export default ViatorWidgetRenderer;