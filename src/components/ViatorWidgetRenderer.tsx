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
    if (!widgetRef.current || !widgetCode) return;

    // First, set the widget HTML
    widgetRef.current.innerHTML = widgetCode.trim();

    // Function to load the script
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById('viator-widget-script');
        if (existingScript) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = 'viator-widget-script';
        script.src = 'https://www.viator.com/orion/js/widgets/viator-widget.js';
        script.async = true;
        script.onload = () => {
          console.log('Viator script loaded');
          resolve();
        };
        script.onerror = (error) => {
          console.error('Error loading Viator script:', error);
          reject(error);
        };
        document.body.appendChild(script);
      });
    };

    // Load script and initialize widget
    const initWidget = async () => {
      try {
        await loadScript();
        
        // Give a moment for the script to initialize
        setTimeout(() => {
          if (window.OrionWidgetRefresh) {
            console.log('Refreshing widget');
            window.OrionWidgetRefresh();
          }
        }, 500);
      } catch (error) {
        console.error('Failed to initialize widget:', error);
      }
    };

    initWidget();
  }, [widgetCode]);

  // Refresh widget on route changes
  useEffect(() => {
    if (window.OrionWidgetRefresh) {
      console.log('Route changed, refreshing widget');
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