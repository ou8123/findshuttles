"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;
    let loadTimeout: NodeJS.Timeout;

    const loadWidget = async () => {
      try {
        // Clear previous content
        container.innerHTML = '';

        // Create a blob URL for the widget code
        const blob = new Blob([widgetCode], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        // Create an iframe to load the widget
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '400px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';

        // Add load handler
        iframe.onload = () => {
          setIsLoading(false);
          setError(null);
        };

        // Add error handler
        iframe.onerror = () => {
          setError('Failed to load widget');
          setIsLoading(false);
        };

        // Set the src and append the iframe
        iframe.src = blobUrl;
        container.appendChild(iframe);

        // Set timeout for load
        loadTimeout = setTimeout(() => {
          if (isLoading) {
            setError('Widget took too long to load');
            setIsLoading(false);
          }
        }, 10000);

        // Cleanup blob URL
        return () => URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Error loading widget:', err);
        setError('Failed to load widget');
        setIsLoading(false);
      }
    };

    // Start loading with initial delay
    const initTimeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      loadWidget();
    }, 1000);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [widgetCode, isLoading]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`min-h-[300px] transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
      {error && (
        <div className="text-red-500 text-sm mt-2 text-center">
          {error}. Please refresh the page to try again.
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;