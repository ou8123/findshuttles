"use client";

import { useEffect, useRef, useState } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasViator, setHasViator] = useState(false);

  useEffect(() => {
    if (!widgetCode) return;

    let checkInterval: NodeJS.Timeout;
    let loadTimeout: NodeJS.Timeout;

    const checkViator = () => {
      if ((window as any).viator) {
        setHasViator(true);
        setIsLoading(false);
        clearInterval(checkInterval);
      }
    };

    // Start checking for Viator object after a delay
    const startChecking = () => {
      checkInterval = setInterval(checkViator, 500);

      // Set a timeout to stop checking
      loadTimeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!hasViator) {
          setError('Widget took too long to load');
          setIsLoading(false);
        }
      }, 10000);
    };

    // Start the process with a delay
    const initTimeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      startChecking();
    }, 1000);

    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      clearInterval(checkInterval);
      setHasViator(false);
    };
  }, [widgetCode, hasViator]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading booking widget...</div>
        </div>
      )}
      <div 
        className={`min-h-[300px] transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        dangerouslySetInnerHTML={{ __html: widgetCode }}
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