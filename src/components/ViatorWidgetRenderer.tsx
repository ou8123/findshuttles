"use client";

import { useEffect, useRef } from 'react';
import { extractScripts, loadScript, loadScriptContent } from '@/lib/scriptLoader';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadWidget = async () => {
      if (!containerRef.current || !widgetCode) return;

      try {
        // Clear any existing content
        containerRef.current.innerHTML = '';

        // Extract scripts and remaining HTML
        const { scripts, inlineScripts, remainingHtml } = extractScripts(widgetCode);

        // Set the HTML content first
        containerRef.current.innerHTML = remainingHtml;

        // Load external scripts sequentially
        for (const src of scripts) {
          await loadScript(src);
        }

        // Load inline scripts sequentially
        for (const content of inlineScripts) {
          await loadScriptContent(content);
        }

      } catch (error) {
        console.error('Error loading widget:', error);
        containerRef.current.innerHTML = 'Error loading booking widget. Please try refreshing the page.';
      }
    };

    loadWidget();

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode]);

  return (
    <div 
      ref={containerRef}
      className="w-full min-h-[400px] relative"
      style={{ 
        height: 'fit-content',
        overflow: 'visible'
      }}
    />
  );
};

export default ViatorWidgetRenderer;