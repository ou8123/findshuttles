"use client"; // This component needs useEffect

import React, { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && widgetCode) {
      // Clear previous content in case of re-renders
      containerRef.current.innerHTML = '';

      // Create a temporary div to parse the widget code
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = widgetCode;

      // Find all script tags within the widget code
      const scripts = Array.from(tempDiv.querySelectorAll('script'));

      // Append non-script elements first
      Array.from(tempDiv.childNodes).forEach(node => {
        if (node.nodeName !== 'SCRIPT') {
          containerRef.current?.appendChild(node.cloneNode(true));
        }
      });

      // Append and execute scripts one by one
      scripts.forEach(originalScript => {
        const script = document.createElement('script');
        // Copy attributes (like src, async, etc.)
        Array.from(originalScript.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        // Copy inline script content
        if (originalScript.innerHTML) {
          script.innerHTML = originalScript.innerHTML;
        }
        containerRef.current?.appendChild(script);
        // Note: Scripts added this way might execute depending on browser behavior and script attributes (e.g., src vs inline)
      });
    }

    // Cleanup function (optional, might be needed if scripts add global listeners)
    // return () => {
    //   if (containerRef.current) {
    //     containerRef.current.innerHTML = '';
    //   }
    // };

  }, [widgetCode]); // Re-run effect if widgetCode changes

  // Render a container div that the useEffect hook will populate
  return <div ref={containerRef}></div>;
};

export default ViatorWidgetRenderer;