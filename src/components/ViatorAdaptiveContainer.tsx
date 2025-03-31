"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface ViatorAdaptiveContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Viator Adaptive Container
 * 
 * A specialized container component designed specifically for Viator widgets that:
 * - Dynamically adapts to content height with strict limits
 * - Implements stability detection to prevent height oscillation
 * - Has specific optimizations for mobile devices
 * - Handles iframes and dynamic content effectively
 * - Prevents runaway height expansion
 */
const ViatorAdaptiveContainer: React.FC<ViatorAdaptiveContainerProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(350); // Initial height
  const [isStabilized, setIsStabilized] = useState(false);
  const [maxHeightReached, setMaxHeightReached] = useState(false);
  const heightHistoryRef = useRef<number[]>([]);
  const isMobileDevice = useRef(false);
  const lastHeightRef = useRef<number>(0);
  
  // Constants for safety limits
  const MAX_MOBILE_HEIGHT = 800; // Strict limit for mobile
  const MAX_DESKTOP_HEIGHT = 5000; // Safety limit for desktop
  const FORCE_STABILITY_TIMEOUT = 3000; // Force stability after this time
  
  // Device detection (run once on client)
  useEffect(() => {
    isMobileDevice.current = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Set a more appropriate initial height based on device
    if (isMobileDevice.current) {
      setContainerHeight(380);
    }
    
    // Add global styles to help constrain Viator's widget content
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .viator-adaptive-container * {
        max-width: 100vw !important;
        box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  // Core height management system
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Clean up references
    const timers: ReturnType<typeof setTimeout>[] = [];
    let observerRef: ResizeObserver | null = null;
    
    // Force stability after timeout
    const stabilityTimer = setTimeout(() => {
      if (!isStabilized) {
        console.log("Forcing stability after timeout");
        setIsStabilized(true);
      }
    }, FORCE_STABILITY_TIMEOUT);
    
    timers.push(stabilityTimer);
    
    // Enhanced measurement function with stability detection and safety limits
    const updateHeight = () => {
      if (!contentRef.current || maxHeightReached) return;
      
      const height = contentRef.current.scrollHeight;
      const maxHeight = isMobileDevice.current ? MAX_MOBILE_HEIGHT : MAX_DESKTOP_HEIGHT;
      
      // Record this height measurement for stability detection
      heightHistoryRef.current.push(height);
      
      // Only keep the last 5 measurements
      if (heightHistoryRef.current.length > 5) {
        heightHistoryRef.current.shift();
      }
      
      // Check if height exceeds safety limit
      if (height > maxHeight) {
        console.warn(`Widget height ${height}px exceeded limit of ${maxHeight}px - capping height`);
        setContainerHeight(maxHeight);
        setMaxHeightReached(true);
        setIsStabilized(true);
        return;
      }
      
      // Check for runaway growth (detect if height suddenly increases dramatically)
      const previousHeight = lastHeightRef.current;
      if (previousHeight > 100 && height > previousHeight * 1.5 && height > 1000) {
        console.warn("Detected potential runaway height growth, stabilizing at", previousHeight);
        setContainerHeight(previousHeight);
        setMaxHeightReached(true);
        setIsStabilized(true);
        return;
      }
      
      // Check if height has stabilized by comparing recent measurements
      const isHeightStable = heightHistoryRef.current.length >= 3 && 
        heightHistoryRef.current.every(h => 
          Math.abs(h - heightHistoryRef.current[0]) < 10);
      
      // Update height if significant change detected or we haven't stabilized yet
      if (!isStabilized || Math.abs(height - containerHeight) > 10) {
        // Add slight padding to prevent scroll
        const newHeight = Math.min(height + (isMobileDevice.current ? 12 : 8), maxHeight);
        lastHeightRef.current = newHeight;
        setContainerHeight(newHeight);
        
        // Mobile devices should stabilize more quickly
        if (isMobileDevice.current && heightHistoryRef.current.length >= 3) {
          setIsStabilized(true);
          console.log("Mobile widget height stabilized at", newHeight);
        }
        // Desktop stability detection
        else if (isHeightStable && !isStabilized && heightHistoryRef.current.length >= 3) {
          console.log("Widget height has stabilized at", newHeight);
          setIsStabilized(true);
        }
      }
    };
    
    // Progressive measurement schedule with more frequent initial checks
    const measurementTimes = isMobileDevice.current ? 
      [100, 250, 500, 750, 1000, 1400, 1800, 2200] : // More frequent for mobile
      [100, 300, 600, 1000, 1500, 2000, 3000];       // Standard for desktop
    
    measurementTimes.forEach(delay => {
      const timer = setTimeout(() => {
        updateHeight();
      }, delay);
      timers.push(timer);
    });
    
    // Special handling for Viator widgets and iframes
    const checkViatorContent = () => {
      if (!contentRef.current || maxHeightReached) return;
      
      // Look for iframes
      const iframes = contentRef.current.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          // Set up load event handlers
          iframe.addEventListener('load', () => {
            // When iframe loads, update height immediately and again after a delay
            updateHeight();
            setTimeout(updateHeight, 300);
          });
          
          // Set up a mutation observer for the iframe if possible
          if (iframe.contentDocument && iframe.contentDocument.body) {
            const observer = new MutationObserver(() => {
              updateHeight();
            });
            
            observer.observe(iframe.contentDocument.body, { 
              childList: true, 
              subtree: true,
              attributes: true 
            });
          }
        } catch (e) {
          // Cross-origin restrictions will cause this to fail silently
        }
      });
      
      // Look for Viator's specific elements that might affect height
      const viatorElements = contentRef.current.querySelectorAll(
        '[data-viator-widget], .viator-widget, [data-widget-id], [id^="viator"]'
      );
      if (viatorElements.length > 0) {
        console.log("Viator widget elements found:", viatorElements.length);
        
        // Use MutationObserver to monitor Viator's elements for changes
        try {
          const observer = new MutationObserver((mutations) => {
            if (maxHeightReached) return;
            
            let shouldUpdate = false;
            
            // Check if any mutations affect size
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' || 
                  (mutation.type === 'attributes' && 
                   ['style', 'class'].includes(mutation.attributeName || ''))) {
                shouldUpdate = true;
              }
            });
            
            if (shouldUpdate) {
              updateHeight();
            }
          });
          
          viatorElements.forEach(element => {
            observer.observe(element, {
              attributes: true,
              childList: true,
              subtree: true
            });
          });
          
          // Add cleanup function to disconnect after some time
          timers.push(setTimeout(() => observer.disconnect(), 10000));
        } catch (e) {
          console.warn('Error setting up Viator element observer:', e);
        }
      }
    };
    
    // Check periodically for Viator content and iframes
    const checkInterval = setInterval(checkViatorContent, 750);
    
    // Stop checking after some time to prevent unnecessary processing
    const cleanupTimer = setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
    
    timers.push(cleanupTimer);
    
    // Set up ResizeObserver for dynamic content changes
    try {
      observerRef = new ResizeObserver(() => {
        if (!maxHeightReached) {
          updateHeight();
        }
      });
      
      if (contentRef.current) {
        observerRef.observe(contentRef.current);
      }
    } catch (e) {
      console.warn('ResizeObserver not available, using polling fallback');
      // Fallback to periodic checks if ResizeObserver isn't available
      const fallbackInterval = setInterval(updateHeight, 500);
      setTimeout(() => clearInterval(fallbackInterval), 5000);
    }
    
    // Handle window resize events
    const handleResize = () => {
      // Reset stability on window resize
      setIsStabilized(false);
      setMaxHeightReached(false);
      heightHistoryRef.current = [];
      setTimeout(updateHeight, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Visibility change handling for tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateHeight();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up all observers and timers
    return () => {
      observerRef?.disconnect();
      timers.forEach(timer => clearTimeout(timer));
      clearInterval(checkInterval);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [containerHeight, isStabilized, maxHeightReached]);
  
  return (
    <div 
      ref={containerRef}
      className={`viator-adaptive-container ${className}`}
      style={{
        height: `${containerHeight}px`,
        position: 'relative',
        transition: isStabilized ? 
          'height 0.2s ease-out' : // Smooth transition once stable
          'none',                   // No transition during initial measurements
        margin: '1rem 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '8px',
        background: '#fff',
        overflow: 'hidden',
        willChange: 'height', // Optimize for height animations
        maxHeight: isMobileDevice.current ? `${MAX_MOBILE_HEIGHT}px` : `${MAX_DESKTOP_HEIGHT}px`,
      }}
    >
      <div 
        ref={contentRef}
        className="widget-content"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          // Now including max-width constraint for safety
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ViatorAdaptiveContainer;
