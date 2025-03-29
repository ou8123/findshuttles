"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add a small delay to ensure the widget loads properly
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        const scripts = containerRef.current.getElementsByTagName('script');
        Array.from(scripts).forEach(script => {
          const newScript = document.createElement('script');
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = script.textContent;
          script.parentNode?.replaceChild(newScript, script);
        });
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [widgetCode]);

  return (
    <div 
      ref={containerRef}
      className="min-h-[400px]"
      dangerouslySetInnerHTML={{ __html: widgetCode }}
    />
  );
};

export default ViatorWidgetRenderer;