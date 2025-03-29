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

    // Generate a unique nonce
    const nonce = Math.random().toString(36).substring(2);

    // Parse widget code
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = widgetCode;

    // Extract scripts and add nonce
    const scripts = Array.from(tempDiv.getElementsByTagName('script'));
    scripts.forEach(script => {
      script.setAttribute('nonce', nonce);
      script.remove();
    });

    // Add non-script content
    container.innerHTML = tempDiv.innerHTML;

    // Add scripts back with delay
    setTimeout(() => {
      scripts.forEach(oldScript => {
        const script = document.createElement('script');
        script.setAttribute('nonce', nonce);
        
        // Copy attributes
        Array.from(oldScript.attributes).forEach(attr => {
          if (attr.name !== 'nonce') {
            script.setAttribute(attr.name, attr.value);
          }
        });

        // Copy content
        script.textContent = oldScript.textContent;

        // Add to document
        document.head.appendChild(script);
      });
    }, 2000);

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      document.querySelectorAll(`script[nonce="${nonce}"]`).forEach(script => {
        script.remove();
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