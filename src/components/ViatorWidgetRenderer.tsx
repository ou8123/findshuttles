"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let loadTimeout: NodeJS.Timeout;

    // Function to load widget
    const loadWidget = () => {
      try {
        setIsLoading(true);

        // Parse widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Add scripts back directly
        scripts.forEach(oldScript => {
          const script = document.createElement('script');
          
          // Copy attributes
          Array.from(oldScript.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });

          // Set content
          script.textContent = oldScript.textContent;

          // Add to container directly
          container.appendChild(script);
        });

        // Hide loading after a delay
        loadTimeout = setTimeout(() => {
          setIsLoading(false);
        }, 2000);

      } catch (error) {
        console.error('Error loading widget:', error);
        setIsLoading(false);
      }
    };

    // Start loading with delay
    const initTimeout = setTimeout(loadWidget, 500);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      if (container) {
        container.innerHTML = '';
      }
      setIsLoading(true);
    };
  }, [widgetCode]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`min-h-[400px] transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default ViatorWidgetRenderer;