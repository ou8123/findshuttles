"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;

    // Function to load widget
    const loadWidget = () => {
      try {
        // Add widget code directly
        container.innerHTML = widgetCode;
      } catch (error) {
        console.error('Error loading widget:', error);
      }
    };

    // Start loading with delay
    const initTimeout = setTimeout(loadWidget, 500);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [widgetCode]);

  return (
    <div 
      ref={containerRef}
      className="min-h-[400px]"
    />
  );
};

export default ViatorWidgetRenderer;