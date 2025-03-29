"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

interface ScriptAttribute {
  name: string;
  value: string;
}

interface ScriptData {
  src: string;
  content: string | null;
  attributes: ScriptAttribute[];
}

interface WorkerMessage {
  content: string;
  scripts: ScriptData[];
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;

    const container = containerRef.current;

    // Create a blob URL for the worker code
    const workerCode = `
      self.onmessage = function(e) {
        const widgetCode = e.data;
        
        // Parse widget code
        const parser = new DOMParser();
        const doc = parser.parseFromString(widgetCode, 'text/html');
        
        // Extract scripts
        const scripts = Array.from(doc.getElementsByTagName('script'));
        const scriptData = scripts.map(script => ({
          src: script.src,
          content: script.textContent,
          attributes: Array.from(script.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          }))
        }));
        
        // Remove scripts from content
        scripts.forEach(script => script.remove());
        
        // Send back parsed content and script data
        self.postMessage({
          content: doc.body.innerHTML,
          scripts: scriptData
        });
      };
    `;

    const blob = new Blob([workerCode], { type: 'text/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Handle worker messages
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { content, scripts } = e.data;

      // Add non-script content
      container.innerHTML = content;

      // Add scripts with delay
      setTimeout(() => {
        scripts.forEach((scriptData: ScriptData) => {
          const script = document.createElement('script');
          
          // Add attributes
          scriptData.attributes.forEach((attr: ScriptAttribute) => {
            script.setAttribute(attr.name, attr.value);
          });

          // Set content or src
          if (scriptData.src) {
            script.src = scriptData.src;
          } else if (scriptData.content) {
            script.textContent = scriptData.content;
          }

          // Add to document
          document.head.appendChild(script);
        });
      }, 2000);
    };

    // Send widget code to worker
    worker.postMessage(widgetCode);

    // Cleanup function
    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      if (container) {
        container.innerHTML = '';
      }
      // Remove any scripts we added
      document.querySelectorAll('script').forEach(script => {
        if (script.textContent?.includes('viator')) {
          script.remove();
        }
      });
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