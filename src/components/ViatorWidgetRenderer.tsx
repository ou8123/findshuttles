"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const loadWidget = () => {
    if (!containerRef.current || !widgetCode) return;

    try {
      // Clear previous content
      containerRef.current.innerHTML = '';

      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = widgetCode;

      // Find any script tags in the widget code
      const scriptTags = tempContainer.getElementsByTagName('script');
      
      // First, append non-script content
      containerRef.current.innerHTML = tempContainer.innerHTML;

      // Then handle scripts separately
      const loadScripts = async () => {
        for (const oldScript of Array.from(scriptTags)) {
          try {
            // Create a new script element
            const newScript = document.createElement('script');
            
            // Copy all attributes
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            
            // Handle external scripts
            if (oldScript.src) {
              // Create a promise to track script loading
              await new Promise((resolve, reject) => {
                newScript.src = oldScript.src;
                newScript.onload = resolve;
                newScript.onerror = reject;
              });
            } else {
              // For inline scripts
              newScript.textContent = oldScript.textContent;
            }
            
            // Replace the old script with the new one
            oldScript.parentNode?.replaceChild(newScript, oldScript);
          } catch (error) {
            console.error('Error loading script:', error);
            throw error;
          }
        }
      };

      // Load scripts and handle retries
      loadScripts().catch((error) => {
        console.error('Failed to load Viator widget:', error);
        if (retryCount < maxRetries) {
          console.log(`Retrying widget load (attempt ${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
        }
      });
    } catch (error) {
      console.error('Error in widget initialization:', error);
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 1000 * (retryCount + 1));
      }
    }
  };

  useEffect(() => {
    loadWidget();

    // Store the current ref value for cleanup
    const currentContainer = containerRef.current;

    // Cleanup function
    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [widgetCode, retryCount]); // Re-run when widgetCode changes or on retry

  return (
    <div 
      ref={containerRef}
      className="viator-widget-container"
    />
  );
};

export default ViatorWidgetRenderer;