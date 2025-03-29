"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    // Add scripts after a delay
    const timeout = setTimeout(() => {
      const scripts = Array.from(containerRef.current?.getElementsByTagName('script') || []);
      scripts.forEach(oldScript => {
        const script = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        script.textContent = oldScript.textContent;
        oldScript.parentNode?.replaceChild(script, oldScript);
      });
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
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