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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Effect to load the main Viator script (widget.js) once per page session
  useEffect(() => {
    if (typeof window === 'undefined' || viatorScriptLoadAttempted) {
      // Don't run on server or if script load has already been attempted
      return;
    }

    viatorScriptLoadAttempted = true;
    const script = document.createElement('script');
    script.src = 'https://www.viator.com/orion/partner/widget.js';
    script.async = true;

    script.onload = () => {
      viatorScriptLoadedSuccessfully = true;
      viatorScriptLoadError = false;
      // Dispatch resize as the script might initialize widgets present in the DOM
      window.dispatchEvent(new Event('resize'));
    };

    script.onerror = () => {
      console.error('ViatorSimpleWidget: Failed to load Viator main script (widget.js).');
      viatorScriptLoadedSuccessfully = false;
      viatorScriptLoadError = true;
      // This will cause individual widgets that depend on it to show an error.
    };

    document.body.appendChild(script);
    // This script is intended to stay loaded for the page session, so no cleanup in this effect.
  }, []); // Empty dependency array ensures this runs only once

  // Effect to handle widgetCode changes and render the specific widget instance
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) {
      return;
    }

    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; // Always clear previous content first

    if (!widgetCode) {
      setIsLoading(false);
      setHasError(false); // No widget code, so not loading and no error
      return;
    }

    // Reset states for the current widget rendering attempt
    setIsLoading(true);
    setHasError(false);

    // If the main Viator script itself failed to load, this widget cannot load.
    if (viatorScriptLoadError) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Inject the new widget HTML content
    currentContainer.innerHTML = widgetCode;

    if (viatorScriptLoadedSuccessfully) {
      // If the main script is confirmed loaded, the widget should be processed.
      // The "Try Again" button's success implies re-injecting HTML is picked up.
      setTimeout(() => {
        setIsLoading(false); // Assume the widget is now rendered or being rendered by widget.js
        window.dispatchEvent(new Event('resize')); // Nudge for layout
      }, 100); // Short delay, adjust if needed
    } else if (viatorScriptLoadAttempted && !viatorScriptLoadedSuccessfully && !viatorScriptLoadError) {
      // Main script load is in progress. Widget HTML is injected.
      // Rely on the main script's onload to eventually process this widget.
      // isLoading is already true. Add a timeout to prevent indefinite loading state for this widget.
      const processingTimeoutId = setTimeout(() => {
        // Check if still loading after a reasonable period
        // This check needs to be against a component's own loading state if setIsLoading is called in script.onload
        // For simplicity, we assume if script.onload hasn't flipped viatorScriptLoadedSuccessfully, this widget might be stuck.
        if (!viatorScriptLoadedSuccessfully) { // Re-check main script status
          console.warn('ViatorSimpleWidget: Widget loading timed out. Main script might not have processed it or is still loading.');
          setHasError(true); // Show error for this specific widget
          setIsLoading(false);
        } else {
          // If main script loaded in the meantime, but this widget didn't clear its loading state
          setIsLoading(false);
          window.dispatchEvent(new Event('resize'));
        }
      }, 5000); // 5-second timeout for this widget to be processed after injection
      return () => clearTimeout(processingTimeoutId);
    } else if (!viatorScriptLoadAttempted) {
      // This case (script load not attempted yet) should ideally be handled by the mount effect.
      // If reached, it implies a potential race or logic issue.
      // For now, keep isLoading true and hope the mount effect for script loading runs soon.
    }
    // No script tag cleanup here, as the main script is managed by the first effect.
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
        }}
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 5,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3498db',
                borderRadius: '50%',
                animation: 'viatorSpin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#555' }}>
              Loading travel options...
            </p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 5,
          }}
        >
          <div style={{
            padding: '16px',
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            borderRadius: '4px',
            maxWidth: '80%',
            textAlign: 'center',
          }}>
            <p style={{ color: '#cf1322' }}>
              There was an issue loading the booking widget.
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (containerRef.current) {
                  containerRef.current.innerHTML = '';
                  containerRef.current.innerHTML = widgetCode;
                }
              }}
              style={{
                marginTop: '8px',
                padding: '6px 16px',
                background: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes viatorSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ViatorSimpleWidget;
