"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    // First, inject the widget code
    containerRef.current.innerHTML = widgetCode;

    // Find any script tags in the widget code
    const scriptTags = containerRef.current.getElementsByTagName('script');
    
    // Convert the HTMLCollection to an array and handle each script
    Array.from(scriptTags).forEach(oldScript => {
      // Create a new script element
      const newScript = document.createElement('script');
      
      // Copy all attributes from the old script to the new one
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy the content/src
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      
      // Replace the old script with the new one
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode]); // Re-run when widgetCode changes

  return (
    <div 
      ref={containerRef}
      className="viator-widget-container"
    />
  );
};

export default ViatorWidgetRenderer;