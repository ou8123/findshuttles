"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

declare global {
  interface Window {
    OrionWidgetRefresh?: () => void;
  }
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check if script is already in the document
    const existingScript = document.getElementById("viator-widget-script");

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.viator.com/orion/js/widgets/viator-widget.js";
      script.async = true;
      script.id = "viator-widget-script";
      document.body.appendChild(script);

      script.onload = () => {
        if (window.OrionWidgetRefresh) {
          window.OrionWidgetRefresh();
        }
      };
    } else {
      // If script is already present, just refresh the widget
      if (window.OrionWidgetRefresh) {
        window.OrionWidgetRefresh();
      }
    }
  }, []);

  // Refresh widget on route changes
  useEffect(() => {
    if (window.OrionWidgetRefresh) {
      window.OrionWidgetRefresh();
    }
  }, [pathname]);

  return (
    <div>
      <div
        ref={widgetRef}
        className="w-full min-h-[400px]"
        style={{ 
          height: 'auto',
          overflow: 'visible'
        }}
        dangerouslySetInnerHTML={{ __html: widgetCode }}
      />
      <div className="text-center mt-4">
        <button
          onClick={() => {
            if (window.OrionWidgetRefresh) {
              window.OrionWidgetRefresh();
            } else {
              window.location.reload();
            }
          }}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          Shuttle Options not loading? Click here
        </button>
      </div>
    </div>
  );
};

export default ViatorWidgetRenderer;