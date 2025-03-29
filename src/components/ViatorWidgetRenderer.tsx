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

    const initWidget = () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'text-center p-4';
        loadingDiv.textContent = 'Loading booking widget...';
        container.appendChild(loadingDiv);

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Extract scripts
        const scripts = Array.from(tempDiv.getElementsByTagName('script'));
        scripts.forEach(script => script.remove());

        // Add non-script content
        container.innerHTML = tempDiv.innerHTML;

        // Add scripts directly
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

        // Hide loading indicator after a delay
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);

      } catch (error) {
        console.error('Error initializing widget:', error);
        setIsLoading(false);
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