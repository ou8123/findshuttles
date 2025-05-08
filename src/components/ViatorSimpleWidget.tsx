"use client";

import { useEffect, useRef } from 'react';

const VIATOR_SCRIPT_ID = 'viator-main-widget-script';

// Module-level flags, reset on each "successful" script removal attempt or page load.
// These are now more like instance-based flags due to the reset logic.
let scriptLoadInitiatedThisInstance = false;
let scriptLoadedSuccessfullyThisInstance = false;
let scriptLoadErrorThisInstance = false;


interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
  uniqueKey: string; // Used for logging and potentially for more fine-grained control if needed
}

const ViatorSimpleWidget: React.FC<ViatorSimpleWidgetProps> = ({
  widgetCode,
  className = '',
  minHeight = 240,
  uniqueKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // console.log(`[ViatorSimpleWidget ${uniqueKey}] Mount/Update. WidgetCode: ${widgetCode ? 'Present' : 'Absent'}`);

    // --- Attempt to clean up previous script and reset state ---
    // This happens on each mount (due to key change on parent page)
    const existingScript = document.getElementById(VIATOR_SCRIPT_ID);
    if (existingScript) {
      // console.log(`[ViatorSimpleWidget ${uniqueKey}] Removing existing Viator script.`);
      existingScript.remove();
    }
    // Reset flags for this "new" instance/attempt
    scriptLoadInitiatedThisInstance = false;
    scriptLoadedSuccessfullyThisInstance = false;
    scriptLoadErrorThisInstance = false;
    // --- End cleanup ---

    currentContainer.innerHTML = ''; // Clear container

    if (!widgetCode) {
      currentContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #888;">No booking information available.</p>';
      return;
    }

    const loadAndRender = () => {
      if (scriptLoadedSuccessfullyThisInstance) {
        // console.log(`[ViatorSimpleWidget ${uniqueKey}] Main script already loaded. Rendering widget.`);
        currentContainer.innerHTML = widgetCode;
        window.dispatchEvent(new Event('resize'));
        return;
      }

      if (scriptLoadErrorThisInstance) {
        // console.log(`[ViatorSimpleWidget ${uniqueKey}] Main script failed to load previously. Showing error.`);
        currentContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget failed: main script error.</p>';
        return;
      }

      if (scriptLoadInitiatedThisInstance) {
        // Script load is in progress by this instance, but not yet complete.
        // This state should ideally be short-lived.
        // console.log(`[ViatorSimpleWidget ${uniqueKey}] Main script loading is in progress by this instance. Waiting...`);
        // We could implement a timeout here if needed, but let's see if onload handles it.
        // For now, we'll inject and hope the script picks it up when it loads.
        currentContainer.innerHTML = widgetCode; // Pre-inject
        return;
      }

      // console.log(`[ViatorSimpleWidget ${uniqueKey}] Initiating main Viator script load.`);
      scriptLoadInitiatedThisInstance = true;
      const script = document.createElement('script');
      script.id = VIATOR_SCRIPT_ID;
      script.src = 'https://www.viator.com/orion/partner/widget.js';
      script.async = true;

      script.onload = () => {
        // console.log(`[ViatorSimpleWidget ${uniqueKey}] Main Viator script loaded successfully.`);
        scriptLoadedSuccessfullyThisInstance = true;
        scriptLoadErrorThisInstance = false;
        
        // Now render the widget content for this instance
        if (containerRef.current && containerRef.current.innerHTML !== widgetCode) { // Check if not already injected by a race condition
            containerRef.current.innerHTML = widgetCode;
        }
        window.dispatchEvent(new Event('resize'));
      };

      script.onerror = () => {
        console.error(`[ViatorSimpleWidget ${uniqueKey}] Failed to load Viator main script (widget.js).`);
        scriptLoadedSuccessfullyThisInstance = false;
        scriptLoadErrorThisInstance = true;
        if (containerRef.current) {
          containerRef.current.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget could not be loaded due to a script error.</p>';
        }
      };

      document.body.appendChild(script);
      // Pre-inject the HTML. The script, upon loading, should process it.
      // This helps if the script processes DOM content present at load time.
      currentContainer.innerHTML = widgetCode;
    };

    loadAndRender();

    // No specific cleanup for this effect, as script is managed per "instance" due to keying.
    // The script tag is removed at the start of the effect on next mount.
  }, [widgetCode, uniqueKey]); // uniqueKey ensures this runs on remount

  return (
    <div className={`viator-simple-widget ${className}`}>
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
