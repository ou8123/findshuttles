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

      const script = scriptQueue[currentScriptIndex];
      const newScript = document.createElement('script');

      // Copy attributes
      Array.from(script.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Copy content
      if (script.src) {
        newScript.src = script.src;
        newScript.async = false;
      } else {
        newScript.textContent = script.textContent;
      }

      // Add load handlers
      newScript.onload = () => {
        currentScriptIndex++;
        setTimeout(loadNextScript, 500); // 500ms delay between scripts
      };

      newScript.onerror = () => {
        console.error('Failed to load script:', script.src || 'inline script');
        currentScriptIndex++;
        setTimeout(loadNextScript, 500);
      };

      // Add to document
      document.head.appendChild(newScript);
    };

    const initWidget = () => {
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
        console.error('Error initializing widget:', error);
      }
    };

    // Start with a delay
    const initTimeout = setTimeout(initWidget, 2000);

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