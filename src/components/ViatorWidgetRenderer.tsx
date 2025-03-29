"use client";

import { useEffect, useRef } from 'react';

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !widgetCode) return;

    // Create a complete HTML document
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, sans-serif;
              background: transparent;
            }
            .widget-container {
              min-height: 400px;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="widget-container">
            ${widgetCode}
          </div>
        </body>
      </html>
    `;

    // Set iframe content
    iframeRef.current.srcdoc = html;

  }, [widgetCode]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full min-h-[400px] border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
};

export default ViatorWidgetRenderer;