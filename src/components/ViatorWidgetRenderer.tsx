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

    // Find all script tags
    const scripts = tempDiv.getElementsByTagName('script');
    const scriptElements = Array.from(scripts);

    // Remove scripts from the temp div
    scriptElements.forEach(script => script.remove());

    // Set the HTML content first (without scripts)
    containerRef.current.innerHTML = tempDiv.innerHTML;

    // Function to load a script
    const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');

        // Copy all attributes
        Array.from(scriptElement.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });

        // Handle external scripts
        if (scriptElement.src) {
          script.onload = () => resolve();
          script.onerror = () => reject();
        }

        // Copy inline script content
        if (scriptElement.textContent) {
          script.textContent = scriptElement.textContent;
        }

        // For inline scripts, resolve immediately
        if (!scriptElement.src) {
          script.onload = () => resolve();
        }

        // Add to document
        document.head.appendChild(script);
      });
    };

    // Load scripts sequentially
    const loadScripts = async () => {
      for (const script of scriptElements) {
        try {
          await loadScript(script);
          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error loading script:', error);
        }
      }
    };

    // Start loading scripts with a delay
    setTimeout(loadScripts, 500);

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
      className="w-full min-h-[400px]"
      style={{ 
        height: 'auto',
        overflow: 'visible'
      }}
    />
  );
};

export default ViatorWidgetRenderer;