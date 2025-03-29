"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    // Create a temporary div to parse the widget code
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = widgetCode;

    // Clear any existing content
    containerRef.current.innerHTML = '';

    // Add the widget code
    containerRef.current.appendChild(tempDiv);

    // Initialize any scripts
    const scripts = tempDiv.getElementsByTagName('script');
    Array.from(scripts).forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode]);

  return (
    <div 
      ref={containerRef}
      className="w-full min-h-[400px] relative"
      style={{ 
        height: 'fit-content',
        overflow: 'visible'
      }}
    />
  );
};

export default ViatorWidgetRenderer;