"use client";

import { useEffect, useRef } from 'react';

interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
  // The `key` prop provided by the parent component in page.tsx will ensure
  // this component instance is new for each route, triggering useEffect.
}

const ViatorSimpleWidget: React.FC<ViatorSimpleWidgetProps> = ({
  widgetCode,
  className = '',
  minHeight = 240,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !iframeRef.current) {
      return;
    }

    const iframe = iframeRef.current;

    if (!widgetCode) {
      // Clear iframe or show placeholder if no widget code
      iframe.srcdoc = '<p style="text-align: center; padding: 20px; color: #888;">No booking information available.</p>';
      return;
    }

    // Construct the HTML for the iframe
    // This includes the specific widget code and the main Viator script loader.
    // The main Viator script will be loaded fresh inside each iframe instance.
    const iframeHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Viator Widget</title>
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: ${minHeight}px; }
          /* Basic styling for the widget container within the iframe if needed */
          .viator-widget-wrapper { width: 100%; }
        </style>
      </head>
      <body>
        <div class="viator-widget-wrapper">
          ${widgetCode}
        </div>
        <script async src="https://www.viator.com/orion/partner/widget.js"></script>
      </body>
      </html>
    `;

    iframe.srcdoc = iframeHtml;

    // Optional: Clean up srcdoc on unmount, though remounting with a new key
    // should effectively replace the iframe.
    return () => {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = ''; // Clear content on unmount
      }
    };
  }, [widgetCode, minHeight]); // Re-run if widgetCode or minHeight changes

  return (
    <div className={`viator-simple-widget ${className}`}>
      <iframe
        ref={iframeRef}
        title="Viator Booking Widget"
        style={{
          width: '100%',
          minHeight: `${minHeight}px`,
          border: '1px solid rgba(0,0,0,0.1)', // Keep some styling for the frame
          borderRadius: '8px',
          background: '#fff', // Background for the iframe itself
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
        // sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Consider sandbox attributes
        // allow="payment *" // If payment processing happens directly in widget
      />
    </div>
  );
};

export default ViatorSimpleWidget;
