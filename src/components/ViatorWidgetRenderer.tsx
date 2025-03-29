"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = widgetCode;

    // First, append all non-script content
    const nonScriptNodes = Array.from(tempDiv.childNodes).filter(
      node => !(node instanceof HTMLScriptElement)
    );
    containerRef.current.innerHTML = '';
    nonScriptNodes.forEach(node => {
      containerRef.current?.appendChild(node.cloneNode(true));
    });

    // Then handle scripts
    const scripts = Array.from(tempDiv.getElementsByTagName('script'));
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy the content/src
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      
      // Append the script
      document.body.appendChild(newScript);
    });

    // Store the current ref value for cleanup
    const currentContainer = containerRef.current;

    // Cleanup function
    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
      // Remove any scripts we added to the body
      scripts.forEach(oldScript => {
        const scriptSrc = oldScript.src;
        const scriptContent = oldScript.textContent;
        document.querySelectorAll('script').forEach(script => {
          if (
            (scriptSrc && script.src === scriptSrc) ||
            (scriptContent && script.textContent === scriptContent)
          ) {
            script.remove();
          }
        });
      });
    };
  }, [widgetCode]); // Re-run when widgetCode changes

  return (
    <div 
      ref={containerRef}
      className="viator-widget-container min-h-[400px]"
    />
  );
};

export default ViatorWidgetRenderer;