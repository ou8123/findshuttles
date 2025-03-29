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

    // Function to load widget with delay
    const loadWidget = () => {
      // Parse the widget code
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = widgetCode;

      // Extract scripts
      const scripts = Array.from(tempDiv.getElementsByTagName('script'));
      scripts.forEach(script => script.remove());

      // Add non-script content
      container.innerHTML = tempDiv.innerHTML;

      // Add scripts back with delay
      scripts.forEach((oldScript, index) => {
        setTimeout(() => {
          const script = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });
          script.textContent = oldScript.textContent;
          document.head.appendChild(script);
        }, index * 500); // 500ms delay between each script
      });
    };

    // Initial delay before loading widget
    const initTimeout = setTimeout(() => {
      loadWidget();
    }, 2000); // 2 second initial delay

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
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