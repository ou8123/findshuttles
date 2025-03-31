"use client";

import Script from 'next/script';
import { createContext, useContext, useEffect, useState } from 'react';

// Create a context to share the script status across components
interface ViatorScriptContextType {
  isScriptLoaded: boolean;
  triggerWidgetRefresh: () => void;
  refreshCounter: number;
}

const ViatorScriptContext = createContext<ViatorScriptContextType>({
  isScriptLoaded: false,
  triggerWidgetRefresh: () => {},
  refreshCounter: 0
});

// Custom hook to access the Viator script context
export const useViatorScript = () => useContext(ViatorScriptContext);

const VIATOR_SCRIPT_ID = 'viator-global-script';

export default function ViatorScriptLoader() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Function to trigger a refresh of all widgets
  const triggerWidgetRefresh = () => {
    console.log("Triggering Viator widget refresh");
    setRefreshCounter(prev => prev + 1);
    
    // Force a resize event after a short delay to help Viator widgets reinitialize
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log("Dispatching resize event to reinitialize widgets");
        window.dispatchEvent(new Event('resize'));
      }
    }, 200);
  };

  useEffect(() => {
    // Check if script is already loaded in DOM
    if (typeof window !== 'undefined' && document.getElementById(VIATOR_SCRIPT_ID)) {
      console.log("Viator script already found in DOM");
      setIsScriptLoaded(true);
    }

    // Set up navigation change detection to refresh widgets
    if (typeof window !== 'undefined') {
      const handleRouteChange = () => {
        console.log("Route change detected, scheduling widget refresh");
        // Delay the refresh to ensure DOM is updated
        setTimeout(triggerWidgetRefresh, 300);
      };

      window.addEventListener('popstate', handleRouteChange);
      
      // Attempt to detect Next.js navigation
      const originalPushState = history.pushState;
      history.pushState = function(...args) {
        const result = originalPushState.apply(this, args);
        handleRouteChange();
        return result;
      };

      return () => {
        window.removeEventListener('popstate', handleRouteChange);
        history.pushState = originalPushState;
      };
    }
  }, []);

  return (
    <ViatorScriptContext.Provider 
      value={{ 
        isScriptLoaded, 
        triggerWidgetRefresh, 
        refreshCounter 
      }}
    >
      <Script
        id={VIATOR_SCRIPT_ID}
        src="https://www.viator.com/orion/partner/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Global Viator script loaded successfully");
          setIsScriptLoaded(true);
          // Initial refresh trigger
          setTimeout(triggerWidgetRefresh, 200);
        }}
        onError={(e) => {
          console.error("Error loading global Viator script:", e);
          setIsScriptLoaded(false);
        }}
      />
    </ViatorScriptContext.Provider>
  );
}
