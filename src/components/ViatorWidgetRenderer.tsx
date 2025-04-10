"use client";

import { useEffect, useRef, useState } from 'react';

// Add global type declaration for window._viatorScriptLoaded
declare global {
  interface Window {
    _viatorScriptLoaded?: boolean;
  }
}

// Helper function to detect mobile devices
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for mobile user agent patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // Check viewport width
  const isMobileWidth = window.innerWidth < 768;
  
  return mobileRegex.test(navigator.userAgent) || isMobileWidth;
};

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
  
  // Check if we're on a mobile device (client-side only)
  const [isMobile, setIsMobile] = useState(false);
  
  // Set up mobile detection on client side
  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    // Update on resize
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Store measurements for height tracking
  const [containerHeight, setContainerHeight] = useState(isMobile ? 300 : 400); // Smaller initial height for mobile
  const [detectedContentHeight, setDetectedContentHeight] = useState(0);
  const [heightChecks, setHeightChecks] = useState(0);
  
  // ResizeObserver reference
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Force re-render on route changes and use the navigationId to ensure re-renders during navigation
  const [forceRenderKey, setForceRenderKey] = useState(Date.now());
  
  // Track if component is in viewport
  const isInViewport = useRef(false);
  
  // Track route navigation - use the pathname as key
  const [currentRouteUrl, setCurrentRouteUrl] = useState<string>('');
  
  // Track route navigation changes using window.location
  useEffect(() => {
    // Function to handle navigation
    const handleNavigation = () => {
      const currentUrl = window.location.href;
      
      // If URL has changed, update the state and trigger re-render
      if (currentUrl !== currentRouteUrl && currentRouteUrl !== '') {
        console.log(`Route changed from ${currentRouteUrl} to ${currentUrl}`);
        
        // Force complete re-rendering of component on URL change
        setForceRenderKey(Date.now());
        
        // Reset widget state
        setWidgetId(`widget-${Math.random().toString(36).substring(2, 9)}`);
        setHasError(false);
        setContainerHeight(400);
        setDetectedContentHeight(0);
        setHeightChecks(0);
        
        // Clean up iframe reference
        if (iframeRef.current) {
          iframeRef.current = null;
        }
      }
      
      // Update current URL
      setCurrentRouteUrl(currentUrl);
    };
    
    // Initialize current URL on first render
    if (currentRouteUrl === '') {
      setCurrentRouteUrl(window.location.href);
    }
    
    // Set up event listeners for route changes
    window.addEventListener('popstate', handleNavigation);
    
    // Check for URL changes periodically (catches client-side routing)
    const navigationCheckInterval = setInterval(handleNavigation, 500);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(navigationCheckInterval);
    };
  }, [currentRouteUrl]);
  
  // Reset component when widgetCode changes (complementary to URL tracking)
  useEffect(() => {
    // Force a complete re-render when the widgetCode changes
    setForceRenderKey(Date.now());
    
    // Reset states with appropriate height based on device
    setWidgetId(`widget-${Math.random().toString(36).substring(2, 9)}`);
    setHasError(false);
    setContainerHeight(isMobile ? 300 : 400);
    setDetectedContentHeight(0);
    setHeightChecks(0);
    
    // Clean up any iframe reference
    if (iframeRef.current) {
      iframeRef.current = null;
    }
    
    // Check if component is currently visible
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      isInViewport.current = 
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    }
  }, [widgetCode]); // This will trigger on any widgetCode change
  
  // Initialize the widget - depend on forceRenderKey to ensure re-initialization
  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;
    
    // Force removal of previous content
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Clear all previous iframes in our container - extra cleanup
    if (iframeRef.current) {
      try {
        iframeRef.current.remove();
      } catch (e) {
        // Ignore errors if iframe is already gone
      }
      iframeRef.current = null;
    }
    
    console.log(`Initializing Viator widget with key: ${forceRenderKey} at ${new Date().toISOString()}`);
    
    // Create key for debugging and force reinitialize
    document.body.dataset.viatorLastInitTime = new Date().toISOString();
    
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
    
    // Apply basic anti-flicker styles with mobile-specific optimizations
    const applyBasicStyles = (iframe: HTMLIFrameElement) => {
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.marginBottom = '0';
      iframe.style.transform = 'translateZ(0)'; // Hardware acceleration
      iframe.style.backfaceVisibility = 'hidden'; // Prevent flickering
      
      // Mobile-specific adjustments
      if (isMobile) {
        // Smaller height for mobile devices
        iframe.style.minHeight = '300px';
        iframe.style.height = '300px';
        // Mobile optimization - set max-width and scale to fit viewport
        iframe.style.maxWidth = '100%';
        iframe.style.width = '100%';
        iframe.style.overflow = 'hidden'; // Prevent scrollbars on mobile
      } else {
        // Desktop settings
        iframe.style.minHeight = '400px';
        iframe.style.height = '400px';
      }
      
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
    
    // Measure the iframe's content height with stability controls
    const measureFrameHeight = () => {
      // Limit the number of height checks to prevent continuous adjustments
      setHeightChecks(prev => {
        // If we've already checked too many times, skip further measurements to prevent loops
        if (prev > 10) return prev;
        return prev + 1;
      });
      
      // Skip if we don't have an iframe reference
      const iframe = iframeRef.current;
      if (!iframe) return;
      
      try {
// Mobile-specific measurements with more stability
if (isMobile) {
  // New approach for mobile: use a much more strict height limit
  // This prevents the infinite scrolling and layout shift issues
  const fixedMobileHeight = 420; // Even smaller fixed height for better UX
  
  // Only update once to avoid continuous layout shifts
  if (heightChecks <= 2) {
    console.log(`Setting fixed mobile height: ${fixedMobileHeight}px`);
    iframe.style.height = `${fixedMobileHeight}px`;
    setContainerHeight(fixedMobileHeight);
    
    // Apply additional styles for better mobile experience
    iframe.style.overflow = 'hidden'; // Prevent scrollbars
    iframe.style.maxHeight = `${fixedMobileHeight}px`; 
    iframe.style.overflowY = 'scroll'; // Allow scrolling within the iframe
    iframe.style.overflowAnchor = 'none'; // Prevent scroll anchoring
    // Fix for TypeScript error using type assertion to set vendor-prefixed CSS
    (iframe.style as any)['-webkit-overflow-scrolling'] = 'touch'; // Smooth scrolling on iOS
    
    // Apply styles to parent container for stability
    if (containerRef.current) {
      containerRef.current.style.height = `${fixedMobileHeight}px`;
      containerRef.current.style.overflow = 'hidden';
      containerRef.current.style.marginBottom = '40px'; // Add spacing after widget
      containerRef.current.style.overflowAnchor = 'none'; // Prevent scroll anchoring
      
      // Add a scroll indicator
      const scrollIndicator = document.createElement('div');
      scrollIndicator.style.position = 'absolute';
      scrollIndicator.style.bottom = '0';
      scrollIndicator.style.left = '0';
      scrollIndicator.style.right = '0';
      scrollIndicator.style.height = '30px';
      scrollIndicator.style.background = 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,1) 100%)';
      scrollIndicator.style.pointerEvents = 'none';
      scrollIndicator.style.zIndex = '5';
      
      // Add a message indicating scrollability
      const scrollMessage = document.createElement('div');
      scrollMessage.textContent = 'Scroll for more options';
      scrollMessage.style.position = 'absolute';
      scrollMessage.style.bottom = '5px';
      scrollMessage.style.left = '0';
      scrollMessage.style.right = '0';
      scrollMessage.style.textAlign = 'center';
      scrollMessage.style.color = '#666';
      scrollMessage.style.fontSize = '12px';
      scrollMessage.style.fontWeight = '500';
      scrollMessage.style.zIndex = '6';
      scrollMessage.style.pointerEvents = 'none';
      scrollMessage.style.textShadow = '0 0 5px white, 0 0 5px white, 0 0 5px white';
      
      // Add scroll indicators to container
      containerRef.current.appendChild(scrollIndicator);
      containerRef.current.appendChild(scrollMessage);
    }
  }
  
  return; // Exit early for mobile
}
        
        // Desktop measurements - keep original logic
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
  
  // Use IntersectionObserver to detect when widget becomes visible
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            isInViewport.current = true;
            
            // If the widget is visible, check if we need to force a reload
            // This helps with widgets that may not have loaded correctly
            if (containerRef.current && (!iframeRef.current || !iframeRef.current.contentWindow)) {
              console.log("Widget became visible - forcing reload if needed");
              
              // Check if the widget needs reinitialization
              const existingIframe = containerRef.current.querySelector('iframe');
              if (!existingIframe || !existingIframe.src) {
                // Force a reset of the component
                setForceRenderKey(prev => prev + 1);
              }
            }
          } else {
            isInViewport.current = false;
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1, // Trigger when at least 10% of the element is visible
      }
    );
    
    // Start observing the container
    observer.observe(containerRef.current);
    
    // Cleanup observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [forceRenderKey]); // Re-initialize when forceRenderKey changes
  
  return (
    <div 
      className="viator-widget-container"
      style={{ 
        margin: 0, 
        padding: 0,
        position: 'relative',
        minHeight: isMobile ? '450px' : '400px', // Increased height for mobile
        height: 'auto',
        paddingBottom: isMobile ? '40px' : '20px', // Increased padding for mobile
        maxWidth: '100vw', // Ensure it doesn't overflow viewport
        overflowX: 'hidden', // Prevent horizontal scrolling on mobile
        marginBottom: isMobile ? '40px' : '20px', // Extra spacing after widget on mobile
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
          // Add more stable behavior for iframe content
          contain: 'content', // Use CSS containment for better performance
          willChange: 'height', // Optimize height transitions for performance
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
