"use client";

import { useEffect, useRef, useState } from 'react';

const VIATOR_SCRIPT_ID_BASE = 'viator-main-widget-script';

interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
  uniqueKey: string; // This key from the parent ensures this component instance is new
}

const ViatorSimpleWidget: React.FC<ViatorSimpleWidgetProps> = ({
  widgetCode,
  className = '',
  minHeight = 240,
  uniqueKey, // This key changes when navigating to a new route, forcing a remount
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // State to track if the script for *this instance* has loaded
  const [scriptLoadedForThisInstance, setScriptLoadedForThisInstance] = useState(false);
  const [scriptLoadErrorForThisInstance, setScriptLoadErrorForThisInstance] = useState(false);

  useEffect(() => {
    // This effect runs when the component mounts (i.e., when uniqueKey changes)
    if (typeof window === 'undefined' || !containerRef.current) return;

    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; // Clear previous content immediately

    if (!widgetCode) {
      currentContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #888;">No booking information available.</p>';
      setScriptLoadedForThisInstance(true); // No script to load, effectively "loaded"
      return;
    }

    // Reset state for this instance
    setScriptLoadedForThisInstance(false);
    setScriptLoadErrorForThisInstance(false);

    // Attempt to remove any script tag with the same base ID + previous uniqueKey
    // This is a bit more robust than just a fixed ID if multiple widgets were on one page (though not our case here)
    const oldScriptId = `${VIATOR_SCRIPT_ID_BASE}-${uniqueKey}-old`; // A hypothetical old ID scheme
    const oldScript = document.getElementById(oldScriptId) || document.getElementById(VIATOR_SCRIPT_ID_BASE);
    if (oldScript) {
        // console.log(`[ViatorSimpleWidget ${uniqueKey}] Removing old script: ${oldScript.id}`);
        oldScript.remove();
    }
    
    // Create a new script tag for this instance
    const script = document.createElement('script');
    // Use the uniqueKey to make the script ID unique for this mount, helps avoid conflicts
    // and ensures we can target *this* script if needed.
    const currentScriptId = `${VIATOR_SCRIPT_ID_BASE}-${uniqueKey}`;
    script.id = currentScriptId;
    // Add a cache-busting query parameter to the script URL
    script.src = `https://www.viator.com/orion/partner/widget.js?cb=${new Date().getTime()}`;
    script.async = true;

    // console.log(`[ViatorSimpleWidget ${uniqueKey}] Loading script: ${script.src}`);

    script.onload = () => {
      // console.log(`[ViatorSimpleWidget ${uniqueKey}] Script loaded: ${script.id}`);
      setScriptLoadedForThisInstance(true);
      setScriptLoadErrorForThisInstance(false);
      if (containerRef.current) { // Ensure container still exists
        containerRef.current.innerHTML = widgetCode; // Inject content now that script is loaded
        window.dispatchEvent(new Event('resize'));
      }
    };

    script.onerror = () => {
      console.error(`[ViatorSimpleWidget ${uniqueKey}] Error loading script: ${script.src}`);
      setScriptLoadedForThisInstance(false);
      setScriptLoadErrorForThisInstance(true);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget could not be loaded (script error).</p>';
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup when this specific instance unmounts
      // console.log(`[ViatorSimpleWidget ${uniqueKey}] Unmounting. Removing script: ${currentScriptId}`);
      const scriptToRemove = document.getElementById(currentScriptId);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      // Also clear the container just in case
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [widgetCode, uniqueKey]); // Key dependency ensures this runs on remount

  // Conditional rendering based on script load error for this instance
  // This is minimal, as the useEffect handles most direct DOM manipulation.
  // We don't show a loading indicator anymore as per user feedback.
  if (scriptLoadErrorForThisInstance && containerRef.current && !containerRef.current.innerHTML.includes('script error')) {
      // This is a fallback if the onerror in useEffect didn't update innerHTML yet or was cleared
      // It's unlikely to be hit if onerror works as expected.
      containerRef.current.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Booking widget error.</p>';
  }


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
        // The content is set by useEffect
      />
    </div>
  );
};

export default ViatorSimpleWidget;
