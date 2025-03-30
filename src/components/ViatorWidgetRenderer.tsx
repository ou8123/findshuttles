"use client";

import { useEffect, useRef, useState } from 'react';

// Add global type declaration for window._viatorScriptLoaded
declare global {
  interface Window {
    _viatorScriptLoaded?: boolean;
  }
}

interface ViatorWidgetRendererProps {
  widgetCode: string;
  routeSlug?: string; // Optional but no longer used for special handling
}

/**
 * Viator Widget Renderer with Dynamic Height Adjustment
 * 
 * This implementation uses a combination of approaches to properly size the widget:
 * 1. Start with a modest initial height
 * 2. Use ResizeObserver to detect iframe size changes
 * 3. Implement progressive height adjustments
 * 4. Apply anti-flicker CSS properties
 */
const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  
  // Create a stable widget ID that's consistent across server and client renders
  const [widgetId, setWidgetId] = useState<string>('widget-placeholder');

  // Generate a random ID only on the client side to avoid hydration mismatch
  useEffect(() => {
    // Generate a random ID only on the client side
    const randomId = `widget-${Math.random().toString(36).substring(2, 9)}`;
    setWidgetId(randomId);
  }, []);
  
  // Store a reference to the iframe element for height adjustments
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Store measurements for height tracking
  const [containerHeight, setContainerHeight] = useState(400); // Start modest
  const [detectedContentHeight, setDetectedContentHeight] = useState(0);
  const [heightChecks, setHeightChecks] = useState(0);
  
  // ResizeObserver reference
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Initialize the widget
  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;
    
    let cleanup: (() => void)[] = [];
    
    const initWidget = async () => {
      try {
        // Clear any previous content
        containerRef.current!.innerHTML = '';
        
        // Insert the widget HTML
        containerRef.current!.innerHTML = widgetCode;
        
        // Load the Viator script
        await loadViatorScript();
        
        // Find and initialize the iframe
        setTimeout(findAndObserveIframe, 500);
        
        // Set up measurement cycles
        const measurementTimers = [800, 1500, 2500, 3500, 5000].map(delay => {
          const timer = setTimeout(() => {
            measureFrameHeight();
          }, delay);
          return () => clearTimeout(timer);
        });
        
        cleanup.push(...measurementTimers);
        
      } catch (error) {
        console.error('Error initializing Viator widget:', error);
        setHasError(true);
      }
    };
    
    // Helper function to load Viator script once
    const loadViatorScript = () => {
      if (window._viatorScriptLoaded) {
        console.log('Viator script already loaded, reusing');
        return Promise.resolve();
      }
      
      return new Promise<void>((resolve, reject) => {
        try {
          const script = document.createElement('script');
          script.src = 'https://www.viator.com/orion/partner/widget.js';
          script.async = true;
          
          // Handle script load success
          script.onload = () => {
            console.log('Viator widget script loaded successfully');
            window._viatorScriptLoaded = true;
            resolve();
          };
          
          // Handle script load failure
          script.onerror = (err) => {
            console.error('Failed to load Viator widget script:', err);
            reject(err);
          };
          
          // Add script to document body
          document.body.appendChild(script);
        } catch (error) {
          console.error('Error creating script element:', error);
          reject(error);
        }
      });
    };
    
    // Find the iframe and set up ResizeObserver
    const findAndObserveIframe = () => {
      if (!containerRef.current) return;
      
      // Find the iframe
      const iframe = containerRef.current.querySelector('iframe');
      
      if (iframe) {
        // Store reference
        iframeRef.current = iframe;
        
        // Add basic styles that won't change
        applyBasicStyles(iframe);
        
        // Set up ResizeObserver
        setupResizeObserver(iframe);
        
        // Set up MutationObserver
        setupMutationObserver();
        
        // Trigger resize events
        triggerResizeEvents();
      } else {
        // Try again a bit later if iframe not found
        const retryTimer = setTimeout(findAndObserveIframe, 500);
        cleanup.push(() => clearTimeout(retryTimer));
      }
    };
    
    // Apply basic anti-flicker styles
    const applyBasicStyles = (iframe: HTMLIFrameElement) => {
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.marginBottom = '0';
      iframe.style.transform = 'translateZ(0)'; // Hardware acceleration
      iframe.style.backfaceVisibility = 'hidden'; // Prevent flickering
      
      // Set reasonable initial height
      iframe.style.minHeight = '400px';
      iframe.style.height = '400px';
      
      // Setup load event to check actual content height
      iframe.onload = () => measureFrameHeight();
    };
    
    // Set up ResizeObserver to watch for iframe size changes
    const setupResizeObserver = (iframe: HTMLIFrameElement) => {
      try {
        // Clean up any existing observer
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        
        // Create new observer
        resizeObserverRef.current = new ResizeObserver(entries => {
          for (const entry of entries) {
            // Only if the content size actually changed significantly
            const contentRect = entry.contentRect;
            if (contentRect.height > 0) {
              console.log(`ResizeObserver detected height: ${contentRect.height}px`);
              
              // Only update if this is substantially different from current height
              // This prevents resize loops and unnecessary updates
              if (Math.abs(contentRect.height - detectedContentHeight) > 50) {
                setDetectedContentHeight(contentRect.height);
              }
            }
          }
        });
        
        // Start observing
        resizeObserverRef.current.observe(iframe);
        
        // Add cleanup function
        cleanup.push(() => {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
          }
        });
      } catch (err) {
        console.warn('ResizeObserver not supported or error:', err);
      }
    };
    
    // Set up MutationObserver to watch for content changes
    const setupMutationObserver = () => {
      if (!containerRef.current) return;
      
      try {
        const observer = new MutationObserver(mutations => {
          let shouldMeasure = false;
          
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              shouldMeasure = true;
            }
          });
          
          if (shouldMeasure) {
            measureFrameHeight();
          }
        });
        
        observer.observe(containerRef.current, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });
        
        cleanup.push(() => observer.disconnect());
      } catch (err) {
        console.warn('MutationObserver not supported or error:', err);
      }
    };
    
    // Measure the iframe's content height
    const measureFrameHeight = () => {
      // Increment check count for debugging
      setHeightChecks(prev => prev + 1);
      
      // Skip if we don't have an iframe reference
      const iframe = iframeRef.current;
      if (!iframe) return;
      
      try {
        // First try: direct measurement through contentWindow (might fail due to cross-origin)
        try {
          if (iframe.contentWindow && iframe.contentWindow.document.body) {
            const height = iframe.contentWindow.document.body.scrollHeight;
            
            if (height > 50) {
              const newHeight = height + 20; // Small padding
              console.log(`Content height via scrollHeight: ${newHeight}px`);
              
              // Adjust heights
              iframe.style.height = `${newHeight}px`;
              setContainerHeight(newHeight);
              return; // Success, we're done
            }
          }
        } catch (e) {
          // This is expected to fail with cross-origin restrictions
          // We'll fall back to other methods
        }
        
        // Second try: getBoundingClientRect
        const boundingRect = iframe.getBoundingClientRect();
        if (boundingRect.height > 0) {
          // Measure any content that might be in the iframe already
          const visibleHeight = Math.max(boundingRect.height, 400);
          
          // Don't make the container smaller once it's grown
          const newHeight = Math.max(visibleHeight, containerHeight);
          console.log(`Content height via getBoundingClientRect: ${newHeight}px`);
          
          // Adjust heights
          iframe.style.height = `${newHeight}px`;
          setContainerHeight(newHeight);
          return;
        }
        
        // Third try: offsetHeight
        if (iframe.offsetHeight > 0) {
          // Some padding to accommodate content growth
          const newHeight = iframe.offsetHeight + 30;
          console.log(`Content height via offsetHeight: ${newHeight}px`);
          
          // Adjust heights if significantly different
          if (Math.abs(newHeight - containerHeight) > 20) {
            iframe.style.height = `${newHeight}px`;
            setContainerHeight(newHeight);
          }
        }
      } catch (e) {
        console.warn('Error measuring frame height:', e);
      }
    };
    
    // Trigger multiple resize events
    const triggerResizeEvents = () => {
      [100, 500, 1000, 2000].forEach(delay => {
        const timer = setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          measureFrameHeight();
        }, delay);
        
        cleanup.push(() => clearTimeout(timer));
      });
    };
    
    // Start initializing
    initWidget();
    
    // Set up visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerResizeEvents();
        measureFrameHeight();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', measureFrameHeight);
    
    cleanup.push(
      () => document.removeEventListener('visibilitychange', handleVisibilityChange),
      () => window.removeEventListener('resize', measureFrameHeight)
    );
    
    // Cleanup function
    return () => {
      cleanup.forEach(fn => fn());
    };
  }, [widgetCode]);
  
  // Effect to update height when the detected content height changes
  useEffect(() => {
    if (detectedContentHeight > 0 && iframeRef.current) {
      // Add a small buffer to the detected height
      const heightWithBuffer = detectedContentHeight + 20;
      
      // Update iframe height
      iframeRef.current.style.height = `${heightWithBuffer}px`;
      
      // Update container height
      setContainerHeight(Math.max(containerHeight, heightWithBuffer));
    }
  }, [detectedContentHeight]);
  
  return (
    <div 
      className="viator-widget-container"
      style={{ 
        margin: 0, 
        padding: 0,
        position: 'relative',
        minHeight: '400px', // Modest minimum height
        height: 'auto',
        paddingBottom: '20px', // Small padding at bottom
      }}
    >
      <div 
        ref={containerRef}
        className="w-full viator-widget-inner"
        id={widgetId}
        style={{
          height: `${containerHeight}px`, // Dynamic height based on content
          overflow: 'visible',
          display: 'block',
          visibility: 'visible',
          margin: 0,
          padding: 0,
          border: 0,
        }}
      />
      
      {hasError && (
        <div className="p-4 mt-2 text-red-600 bg-red-100 rounded">
          There was an issue loading the tour widget. Please try refreshing the page.
        </div>
      )}
    </div>
  );
};

export default ViatorWidgetRenderer;
