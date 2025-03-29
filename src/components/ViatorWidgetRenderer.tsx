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

    // Function to load a script
    const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        
        // Copy attributes
        Array.from(scriptElement.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });

        // Set content
        if (scriptElement.src) {
          script.src = scriptElement.src;
          script.async = false;
          script.onload = () => resolve();
          script.onerror = () => reject();
        } else {
          script.textContent = scriptElement.textContent;
          resolve();
        }

        // Add to document
        document.head.appendChild(script);
      });
    };

    // Function to load widget
    const loadWidget = async () => {
      try {
        // Parse widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Load scripts sequentially
        for (const script of scripts) {
          await loadScript(script);
          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 100));
        }
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