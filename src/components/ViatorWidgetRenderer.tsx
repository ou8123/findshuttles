"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const loadWidget = () => {
      try {
        // Clear any existing content
        containerRef.current!.innerHTML = widgetCode;

        // Find all script tags
        const scripts = containerRef.current!.getElementsByTagName('script');
        const scriptElements = Array.from(scripts);

        // Remove all script tags (we'll re-add them properly)
        scriptElements.forEach(script => script.remove());

        // Re-add each script properly
        scriptElements.forEach(originalScript => {
          const script = document.createElement('script');
          
          // Copy all attributes
          Array.from(originalScript.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });

          // Copy inline script content
          if (originalScript.innerHTML) {
            script.innerHTML = originalScript.innerHTML;
          }

          // Add the script to the document
          document.body.appendChild(script);
        });
      } catch (error) {
        console.error('Error loading widget:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = 'Error loading booking widget. Please try refreshing the page.';
        }
      }
    };

    // Add a small delay before loading
    const timer = setTimeout(loadWidget, 100);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode]);

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