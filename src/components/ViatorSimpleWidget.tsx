"use client";

import { useEffect, useRef } from 'react';

// Module-level state for managing the main Viator script
let viatorScriptLoadAttempted = false;
let viatorScriptLoadedSuccessfully = false;
let viatorScriptLoadError = false;
let pendingWidgetRenders: Array<{ id: string, renderFn: () => void }> = []; // Store widget render functions with an ID

interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
  uniqueKey: string; // Expect a unique key for managing pending renders
}

const ViatorSimpleWidget: React.FC<ViatorSimpleWidgetProps> = ({
  widgetCode,
  className = '',
  minHeight = 240,
  uniqueKey, // Used to identify this widget instance in the pending queue
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to load the main Viator script (widget.js) once per page session
  useEffect(() => {
    if (typeof window === 'undefined' || viatorScriptLoadAttempted) {
      // If already attempted, subsequent instances don't need to do anything here.
      // If it was successful, their own render effect will handle them.
      // If it failed, their render effect will also show an error.
      return;
    }

    viatorScriptLoadAttempted = true;
    const script = document.createElement('script');
    script.id = 'viator-main-widget-script';
    script.src = 'https://www.viator.com/orion/partner/widget.js';
    script.async = true;

    script.onload = () => {
      viatorScriptLoadedSuccessfully = true;
      viatorScriptLoadError = false;
      window.dispatchEvent(new Event('resize')); // Initial resize after script loads

      // Process any widgets that were mounted and tried to render before the script was fully loaded
      pendingWidgetRenders.forEach(item => item.renderFn());
      pendingWidgetRenders = []; // Clear the queue
    };

    script.onerror = () => {
      console.error('ViatorSimpleWidget: Failed to load Viator main script (widget.js).');
      viatorScriptLoadedSuccessfully = false;
      viatorScriptLoadError = true;
      // Attempt to update already mounted containers to show an error
      document.querySelectorAll('.viator-widget-container-hook').forEach(el => {
        if (el instanceof HTMLElement) {
          el.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget could not be loaded due to a script error.</p>';
        }
      });
      pendingWidgetRenders = []; // Clear queue as renders will fail
    };

    document.body.appendChild(script);
  }, []); // Empty dependency array ensures this runs only once per page session

  // Effect to handle widgetCode changes and render this specific widget instance
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const renderWidget = () => {
      currentContainer.innerHTML = ''; // Clear previous content

      if (viatorScriptLoadError) {
        currentContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget failed: main script error.</p>';
        return;
      }

      if (widgetCode) {
        currentContainer.innerHTML = widgetCode;
        // It's assumed the Viator script, once loaded, will process new widgets.
        // A resize event can help it recognize new content or layout changes.
        window.dispatchEvent(new Event('resize'));
      } else {
        // If no widgetCode, ensure the container is empty or shows a placeholder
        currentContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #888;">No booking information available.</p>';
      }
    };

    if (viatorScriptLoadedSuccessfully) {
      renderWidget();
    } else if (viatorScriptLoadAttempted && !viatorScriptLoadError) {
      // Main script is loading, queue this widget's render function
      // Add if not already queued for this uniqueKey
      if (!pendingWidgetRenders.some(item => item.id === uniqueKey)) {
        pendingWidgetRenders.push({ id: uniqueKey, renderFn: renderWidget });
      }
    } else if (!viatorScriptLoadAttempted) {
      // Main script load hasn't even started (e.g., this component mounts very early)
      // Queue it, the main script loader effect will pick it up.
       if (!pendingWidgetRenders.some(item => item.id === uniqueKey)) {
        pendingWidgetRenders.push({ id: uniqueKey, renderFn: renderWidget });
      }
    } else { // This case implies viatorScriptLoadError is true, handled in renderWidget
        renderWidget();
    }

    return () => {
      // Cleanup: remove this specific render function from the queue if the component unmounts
      // before the script loads and processes it.
      pendingWidgetRenders = pendingWidgetRenders.filter(item => item.id !== uniqueKey);
    };
  }, [widgetCode, uniqueKey]); // Depend on uniqueKey to re-evaluate for new instances

  return (
    // Added 'viator-widget-container-hook' class for error message targeting
    <div className={`viator-simple-widget ${className} viator-widget-container-hook`}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: `${minHeight}px`,
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '8px',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          position: 'relative',
        }}
      />
    </div>
  );
};

export default ViatorSimpleWidget;
