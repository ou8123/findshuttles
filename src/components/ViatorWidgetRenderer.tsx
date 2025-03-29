"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !widgetCode || isLoaded) return;

    const loadWidget = async () => {
      try {
        // Clear any existing content
        containerRef.current!.innerHTML = '';

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Find all script tags
        const scripts = tempDiv.getElementsByTagName('script');
        const scriptContents: string[] = [];
        const scriptSrcs: string[] = [];

        // Extract script contents and sources
        Array.from(scripts).forEach(script => {
          if (script.src) {
            scriptSrcs.push(script.src);
          }
          if (script.textContent) {
            scriptContents.push(script.textContent);
          }
          script.remove();
        });

        // Add the HTML content first
        containerRef.current!.innerHTML = tempDiv.innerHTML;

        // Function to load a script by source
        const loadScript = (src: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject();
            document.body.appendChild(script);
          });
        };

        // Function to execute inline script
        const executeScript = (content: string): void => {
          const script = document.createElement('script');
          script.text = content;
          document.body.appendChild(script);
        };

        // Load all external scripts sequentially
        for (const src of scriptSrcs) {
          await loadScript(src);
          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // After all external scripts are loaded, execute inline scripts
        scriptContents.forEach(content => {
          executeScript(content);
        });

        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading widget:', error);
      }
    };

    // Add a small delay before loading the widget
    setTimeout(loadWidget, 500);

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsLoaded(false);
    };
  }, [widgetCode, isLoaded]);

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