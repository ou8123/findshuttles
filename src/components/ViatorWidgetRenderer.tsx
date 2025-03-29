"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const maxAttempts = 3;
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    // Add a delay before initializing the widget
    const readyTimer = setTimeout(() => {
      setIsReady(true);
    }, 2000); // 2 second delay

    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !widgetCode || !isReady) return;

    // Function to load a script and track its status
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          resolve();
          return;
        }

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
      // Check if script already exists
      const scripts = Array.from(document.getElementsByTagName('script'));
      const exists = scripts.some(s => s.textContent === content);
      if (exists) return;

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
          // Add a small delay between scripts
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Load inline scripts with delay
        inlineScripts.forEach((script, index) => {
          setTimeout(() => {
            loadInlineScript(script.textContent || '');
          }, index * 500); // 500ms delay between each inline script
        });

        // Check for Viator object and widget content
        const checkWidget = setInterval(() => {
          const hasViator = !!(window as any).viator;
          const hasContent = container.querySelector('.viator-embedded');
          
          if (hasViator && hasContent) {
            clearInterval(checkWidget);
            setWidgetLoaded(true);
            console.log('Viator widget loaded successfully');
          }
        }, 500);

        // Clear interval after 15 seconds
        setTimeout(() => {
          clearInterval(checkWidget);
          if (!widgetLoaded && loadAttempts < maxAttempts) {
            console.log(`Attempt ${loadAttempts + 1} failed, retrying...`);
            setLoadAttempts(prev => prev + 1);
          }
        }, 15000);

      } catch (error) {
        console.error('Error loading widget:', error);
        if (loadAttempts < maxAttempts) {
          console.log(`Attempt ${loadAttempts + 1} failed, retrying...`);
          setLoadAttempts(prev => prev + 1);
        }
      }
    };

    // Initialize widget
    initWidget();

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
      setWidgetLoaded(false);
      // Remove all scripts we added
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('viator') || script.src.includes('viator')) {
          script.remove();
        }
      });
    };
  }, [widgetCode, isReady, loadAttempts, widgetLoaded]);

  // Reset load attempts when widget code changes
  useEffect(() => {
    setLoadAttempts(0);
    setWidgetLoaded(false);
  }, [widgetCode]);

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
          className={widgetLoaded ? '' : 'opacity-0'}
        />
      )}
      {loadAttempts >= maxAttempts && !widgetLoaded && (
        <div className="text-red-500 text-sm mt-2 text-center">
          Widget failed to load. Please refresh the page to try again.
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;