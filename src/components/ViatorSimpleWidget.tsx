"use client";

import { useEffect, useRef } from 'react';

// Module-level flags to ensure the Viator script is loaded only once per page session
let viatorScriptLoadAttempted = false;
let viatorScriptLoadedSuccessfully = false;
let viatorScriptLoadError = false; // Track if the main script itself failed to load

interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
  // Note: uniqueKey prop is NOT present in this version's interface
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

  // Effect to load the main Viator script (widget.js) once per page session
  useEffect(() => {
    if (typeof window === 'undefined' || viatorScriptLoadAttempted) {
      // If script load already attempted (successfully or not), don't re-attempt.
      // If it failed, the other useEffect will show an error.
      // If successful, other useEffect will render.
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
      window.dispatchEvent(new Event('resize')); // Dispatch resize on main script load
    };

    script.onerror = () => {
      console.error('ViatorSimpleWidget: Failed to load Viator main script (widget.js).');
      viatorScriptLoadedSuccessfully = false;
      viatorScriptLoadError = true;
      // Attempt to show error in any currently mounted container if script fails
      // This is a bit broad, but targets containers waiting for this script.
      document.querySelectorAll('.viator-simple-widget div[data-widget-container="true"]').forEach(el => {
        if (el instanceof HTMLElement) {
             el.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget could not be loaded (main script error).</p>';
        }
      });
    };

    document.body.appendChild(script);
    // Main script stays loaded.
  }, []); // Empty dependency array: load main script once

  // Effect to handle widgetCode changes and render the specific widget instance
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) {
      return;
    }

    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; // Always clear previous content

    if (viatorScriptLoadError) {
      currentContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget failed: main script error.</p>';
      return;
    }

    if (widgetCode) {
      currentContainer.innerHTML = widgetCode; // Inject the new widget HTML

      if (viatorScriptLoadedSuccessfully) {
        // If main script is already loaded, dispatch resize after a brief delay
        // Also try to dispatch DOMContentLoaded and load events to potentially re-trigger script processing
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          window.dispatchEvent(new Event('DOMContentLoaded'));
          window.dispatchEvent(new Event('load'));
          // console.log(`[ViatorSimpleWidget] Dispatched resize, DOMContentLoaded, load for ${widgetCode ? 'new widget' : 'no widget'}`);
        }, 100); // Increased delay slightly to ensure innerHTML is set
      }
      // If main script is not yet loaded, its onload will dispatch a resize.
    } else {
        currentContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #888;">No booking information available.</p>';
    }
  }, [widgetCode]); // Re-run when widgetCode changes

  return (
    <div className={`viator-simple-widget ${className}`}>
      <div
        ref={containerRef}
        data-widget-container="true" // Added hook for error message
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
