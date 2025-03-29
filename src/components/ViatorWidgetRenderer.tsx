"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 1000;

  const loadScript = async (script: HTMLScriptElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Script load failed'));
    });
  };

  const loadWidget = async () => {
    if (!containerRef.current || !widgetCode) return;

    try {
      // Clear previous content
      containerRef.current.innerHTML = '';

      // Create a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = widgetCode;

      // First, append all non-script content
      const nonScriptNodes = Array.from(tempDiv.childNodes).filter(
        node => !(node instanceof HTMLScriptElement)
      );
      nonScriptNodes.forEach(node => {
        containerRef.current?.appendChild(node.cloneNode(true));
      });

      // Then handle scripts in sequence
      const scripts = Array.from(tempDiv.getElementsByTagName('script'));
      
      for (const oldScript of scripts) {
        const newScript = document.createElement('script');
        
        // Copy attributes
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Handle external vs inline scripts
        if (oldScript.src) {
          newScript.src = oldScript.src;
          try {
            await loadScript(newScript);
          } catch (error) {
            console.error('Failed to load external script:', oldScript.src);
            throw error;
          }
        } else {
          newScript.textContent = oldScript.textContent;
        }

        // Append the script
        containerRef.current?.appendChild(newScript);

        // Small delay between scripts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Additional check for Viator global object
      const checkViatorInterval = setInterval(() => {
        if ((window as any).viator) {
          clearInterval(checkViatorInterval);
        }
      }, 100);

      // Clear interval after 5 seconds
      setTimeout(() => clearInterval(checkViatorInterval), 5000);

    } catch (error) {
      console.error('Error loading widget:', error);
      if (retryCount < maxRetries) {
        console.log(`Retrying widget load (attempt ${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay * (retryCount + 1));
      }
    }
  };

  // Load widget on mount or when widgetCode/retryCount changes
  useEffect(() => {
    loadWidget();

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode, retryCount]);

  return (
    <div 
      ref={containerRef}
      className="viator-widget-container min-h-[400px]"
    />
  );
};

export default ViatorWidgetRenderer;