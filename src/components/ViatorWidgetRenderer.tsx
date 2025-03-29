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

    // Parse the widget code
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = widgetCode;

    // Extract scripts
    const scripts = Array.from(tempDiv.getElementsByTagName('script'));
    scripts.forEach(script => script.remove());

    // Add non-script content
    container.innerHTML = tempDiv.innerHTML;

    // Add scripts back
    scripts.forEach(oldScript => {
      const script = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        script.setAttribute(attr.name, attr.value);
      });
      script.textContent = oldScript.textContent;
      document.body.appendChild(script);
    });

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      scripts.forEach(oldScript => {
        document.querySelectorAll('script').forEach(script => {
          if (script.textContent === oldScript.textContent) {
            script.remove();
          }
        });
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