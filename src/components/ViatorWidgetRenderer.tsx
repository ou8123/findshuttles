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
    let scriptQueue: HTMLScriptElement[] = [];
    let currentScriptIndex = 0;

    const loadNextScript = () => {
      if (currentScriptIndex >= scriptQueue.length) {
        scriptQueue = [];
        currentScriptIndex = 0;
        return;
      }

      const oldScript = scriptQueue[currentScriptIndex];
      const script = document.createElement('script');
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach(attr => {
        script.setAttribute(attr.name, attr.value);
      });

      // Set content
      script.textContent = oldScript.textContent;

      // Add load handler
      script.onload = () => {
        currentScriptIndex++;
        setTimeout(loadNextScript, 100);
      };

      // Add error handler
      script.onerror = () => {
        currentScriptIndex++;
        setTimeout(loadNextScript, 100);
      };

      // Add to document
      document.head.appendChild(script);
    };

    // Function to load widget
    const loadWidget = () => {
      try {
        // Parse widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        scriptQueue = Array.from(tempDiv.getElementsByTagName('script'));
        scriptQueue.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Start loading scripts
        currentScriptIndex = 0;
        loadNextScript();
      } catch (error) {
        console.error('Error loading widget:', error);
      }
    };

    // Start loading with delay
    const initTimeout = setTimeout(loadWidget, 500);

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
      scriptQueue = [];
      currentScriptIndex = 0;
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