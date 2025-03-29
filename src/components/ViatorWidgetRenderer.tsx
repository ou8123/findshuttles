"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    try {
      // Set the widget HTML
      containerRef.current.innerHTML = widgetCode;

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