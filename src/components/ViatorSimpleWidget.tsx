"use client";

import { useState, useEffect, useRef } from 'react';

// Module-level flags to ensure the Viator script is loaded only once per page session
let viatorScriptLoadAttempted = false;
let viatorScriptLoadedSuccessfully = false;
let viatorScriptLoadError = false; // Track if the main script itself failed to load

interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
}

/**
 * ViatorSimpleWidget
 *
 * Loads the main Viator script once and injects widgetCode HTML when it changes.
 */
const ViatorSimpleWidget: React.FC<ViatorSimpleWidgetProps> = ({
  widgetCode,
  className = '',
  minHeight = 240,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Removed isLoading and hasError states

  // Effect to load the main Viator script (widget.js) once per page session
  useEffect(() => {
    if (typeof window === 'undefined' || viatorScriptLoadAttempted) {
      return;
    }

    viatorScriptLoadAttempted = true;
    const script = document.createElement('script');
    script.id = 'viator-main-widget-script'; // Add an ID for potential future reference
    script.src = 'https://www.viator.com/orion/partner/widget.js';
    script.async = true;

    script.onload = () => {
      viatorScriptLoadedSuccessfully = true;
      viatorScriptLoadError = false;
      // Dispatch resize as the script might initialize widgets present in the DOM
      // or widgets injected immediately after script load.
      window.dispatchEvent(new Event('resize'));
    };

    script.onerror = () => {
      console.error('ViatorSimpleWidget: Failed to load Viator main script (widget.js).');
      viatorScriptLoadedSuccessfully = false;
      viatorScriptLoadError = true;
      // If the main script fails, widgets using it won't load.
      // We can update the container of currently mounted widgets if needed.
      // For now, this error is logged, and subsequent widget injections will check viatorScriptLoadError.
    };

    document.body.appendChild(script);
    // Main script stays loaded.
  }, []);

  // Effect to handle widgetCode changes and render the specific widget instance
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) {
      return;
    }

    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; // Always clear previous content

    if (viatorScriptLoadError) {
      // Main script failed to load, display a simple error or leave blank
      currentContainer.textContent = 'Booking widget could not be loaded.';
      return;
    }

    if (widgetCode) {
      currentContainer.innerHTML = widgetCode; // Inject the new widget HTML

      // If the script is already loaded, or once it loads, it should process this.
      // A resize event can help.
      // It's also possible the Viator script automatically scans for new widgets.
      if (viatorScriptLoadedSuccessfully) {
         // Give a very brief moment for DOM update then resize
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      } else {
        // If script is not yet loaded, it should pick up this widget once it does.
        // The onload of the main script also dispatches a resize.
      }
    }
    // No custom loading/error UI for individual widgets beyond the main script error.
  }, [widgetCode]); // Re-run when widgetCode changes

  return (
    <div className={`viator-simple-widget ${className}`}>
      {/* Widget container */}
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
          // Ensure container is visible even if widget content takes time or fails
          // display: 'block', // Default for div
        }}
      />
      {/* Removed custom loading and error message JSX */}
      {/* The style tag for viatorSpin is no longer needed if the loading spinner is removed */}
    </div>
  );
};

export default ViatorSimpleWidget;
