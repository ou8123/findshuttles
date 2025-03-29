"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
  routeSlug: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode, routeSlug }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode || !routeSlug) return;

    try {
      // Create a temporary div to parse the widget code
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = widgetCode;

      // Find the widget div
      const widgetDiv = tempDiv.querySelector('div[id^="viator-"]');
      if (!widgetDiv) {
        console.error('No widget div found in code');
        return;
      }

      // Create our widget container with the correct ID format
      const widgetContainer = document.createElement('div');
      widgetContainer.id = `viator-${routeSlug}`;

      // Copy any data attributes from the original widget
      Array.from(widgetDiv.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          widgetContainer.setAttribute(attr.name, attr.value);
        }
      });

      // Set the container's HTML
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(widgetContainer);

      // Give a moment for the widget to initialize
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 500);
    } catch (error) {
      console.error('Error setting widget:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = 'Error loading booking widget. Please try refreshing the page.';
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode, routeSlug]);

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