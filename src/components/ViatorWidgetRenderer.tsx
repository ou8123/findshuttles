"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let observer: MutationObserver | null = null;
    let loadTimeout: NodeJS.Timeout;

    // Function to load widget
    const loadWidget = () => {
      try {
        setIsLoading(true);

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
                // Widget has been added, hide loading
                setIsLoading(false);
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

        // Add widget code directly
        container.innerHTML = widgetCode;

        // Set timeout for widget check
        loadTimeout = setTimeout(() => {
          if (isLoading) {
            setIsLoading(false);
            observer?.disconnect();
          }
        }, 5000);

      } catch (error) {
        console.error('Error loading widget:', error);
        setIsLoading(false);
      }
    };

    // Start loading with delay
    const initTimeout = setTimeout(loadWidget, 500);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      observer?.disconnect();
      if (container) {
        container.innerHTML = '';
      }
      setIsLoading(true);
    };
  }, [widgetCode, isLoading]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`min-h-[400px] transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default ViatorWidgetRenderer;