"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Viator script only once
    const loadViatorScript = () => {
      return new Promise<void>((resolve) => {
        if (document.querySelector('script[src*="viator.com"]')) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = "https://www.viator.com/orion/partner/widget.js";
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const loadWidget = async () => {
      if (!containerRef.current || !widgetCode) return;

      try {
        // Load Viator script first
        await loadViatorScript();

        // Clear container
        containerRef.current.innerHTML = '';

        // Create a temporary div to parse the widget code
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = widgetCode;

        // Find the widget div and get its ID
        const widgetDiv = tempDiv.querySelector('div[id^="viator-"]');
        if (!widgetDiv) {
          console.error('No widget div found in code');
          return;
        }

        // Set the container's HTML to just the widget div
        containerRef.current.innerHTML = widgetDiv.outerHTML;

        // Give the script a moment to initialize
        setTimeout(() => {
          // Trigger a resize event to help the widget render
          window.dispatchEvent(new Event('resize'));
        }, 500);

      } catch (error) {
        console.error('Error loading widget:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = 'Error loading booking widget. Please try refreshing the page.';
        }
      }
    };

    // Add a small delay before loading
    const timer = setTimeout(loadWidget, 100);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode]);

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
      <div className="text-center mt-4">
        <button
          onClick={() => window.location.reload()}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          Shuttle Options not loading? Click here
        </button>
      </div>
    </div>
  );
};

export default ViatorWidgetRenderer;