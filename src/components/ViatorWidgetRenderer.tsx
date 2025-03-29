"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showReloadLink, setShowReloadLink] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const loadWidget = async () => {
      try {
        const container = containerRef.current;
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '';
        setShowReloadLink(false);

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Find all script tags
        const scripts = tempDiv.getElementsByTagName('script');
        const scriptElements = Array.from(scripts);

        // Remove scripts from the temp div
        scriptElements.forEach(script => script.remove());

        // Set the HTML content first (without scripts)
        container.innerHTML = tempDiv.innerHTML;

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
        for (const script of scriptElements) {
          try {
            await loadScript(script);
            // Add a small delay between scripts
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error('Error loading script:', error);
            setShowReloadLink(true);
          }
        }

        // Add a final delay and trigger resize
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new Event('resize'));

        // Show reload link after a delay if widget might not be visible
        setTimeout(() => {
          if (container.querySelector('iframe')?.clientHeight === 0) {
            setShowReloadLink(true);
          }
        }, 2000);

      } catch (error) {
        console.error('Error loading widget:', error);
        setShowReloadLink(true);
      }
    };

    // Add initial delay
    const timer = setTimeout(loadWidget, 500);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div>
      <div 
        ref={containerRef}
        className="w-full min-h-[400px]"
        style={{ 
          height: 'auto',
          overflow: 'visible'
        }}
      />
      {showReloadLink && (
        <div className="text-center mt-4">
          <button
            onClick={handleReload}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Shuttle Options not loading? Click here
          </button>
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;