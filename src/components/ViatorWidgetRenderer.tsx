"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef<boolean>(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Add a delay before initializing the widget
    const readyTimer = setTimeout(() => {
      setIsReady(true);
    }, 1000); // 1 second delay

    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !widgetCode || !isReady) return;

    // Reset script loaded flag
    scriptLoadedRef.current = false;

    // Function to load a script
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    };

    // Function to load inline script
    const loadInlineScript = (content: string): void => {
      const script = document.createElement('script');
      script.textContent = content;
      document.head.appendChild(script);
    };

    // Function to initialize widget
    const initWidget = async () => {
      try {
        // Clear container
        container.innerHTML = '';

        // Parse widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        const externalScripts = scripts.filter(script => script.src);
        const inlineScripts = scripts.filter(script => !script.src);

        // Remove scripts from temp div
        scripts.forEach(script => script.remove());

        // Add non-script content to container
        container.innerHTML = tempDiv.innerHTML;

        // Load external scripts sequentially
        for (const script of externalScripts) {
          await loadScript(script.src);
        }

        // Load inline scripts
        inlineScripts.forEach(script => {
          loadInlineScript(script.textContent || '');
        });

        scriptLoadedRef.current = true;

        // Check for Viator object
        const checkViator = setInterval(() => {
          if ((window as any).viator) {
            clearInterval(checkViator);
          }
        }, 100);

        // Clear interval after 5 seconds
        setTimeout(() => clearInterval(checkViator), 5000);

      } catch (error) {
        console.error('Error loading widget:', error);
        // Try to reinitialize after a delay
        setTimeout(initWidget, 1000);
      }
    };

    // Initialize widget
    initWidget();

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
      // Remove all scripts we added
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('viator')) {
          script.remove();
        }
      });
    };
  }, [widgetCode, isReady]); // Added isReady to dependencies

  return (
    <div className="viator-widget-container mt-2">
      {!isReady ? (
        <div className="flex items-center justify-center min-h-[300px] bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      ) : (
        <div 
          ref={containerRef}
          style={{ minHeight: '300px', margin: '0 auto' }}
        />
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;