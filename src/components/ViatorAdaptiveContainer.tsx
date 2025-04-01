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
 * - Dynamically adapts to content height with controlled maximum expansion
 * - Uses fixed height with internal scrolling when content exceeds limits
 * - Implements gentle stability detection to prevent height oscillation
 * - Has specific optimizations for mobile and desktop devices
 * - Handles iframes and dynamic content effectively
 * - Maintains persistent monitoring for continued height adjustment
 */
const ViatorAdaptiveContainer: React.FC<ViatorAdaptiveContainerProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(180); // Lower initial height
  const [contentHeight, setContentHeight] = useState(0); // Actual content height
  const [isStabilized, setIsStabilized] = useState(false);
  const heightHistoryRef = useRef<number[]>([]);
  const isMobileDevice = useRef(false);
  
  // Constants for adjustments
  const MAX_MOBILE_HEIGHT = 800; // Height limit for mobile devices with scrolling
  const MAX_DESKTOP_HEIGHT = 1000; // Height limit for desktop devices to prevent endless expansion (especially in Brave)
  const STABILITY_VARIANCE = 20; // Allow more variance for stability detection
  const FORCE_STABILITY_TIMEOUT = 4000; // Force initial stability after this time
  const HEIGHT_PADDING = 20; // Padding added to calculated height to avoid scroll
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const actualContentRef = useRef<HTMLDivElement | null>(null);
  
  // Device detection (run once on client)
  useEffect(() => {
    isMobileDevice.current = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);
  
  // Core height management system
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Clean up references
    const timers: ReturnType<typeof setTimeout>[] = [];
    let observerRef: ResizeObserver | null = null;
    
    // Force initial stability after timeout - this only affects initial rendering
    const initialStabilityTimer = setTimeout(() => {
      if (!isStabilized) {
        console.log("Forcing initial stability after timeout");
        setIsStabilized(true);
      }
    }, FORCE_STABILITY_TIMEOUT);
    
    timers.push(initialStabilityTimer);
    
    // But continue to monitor for content changes even after stability
    const monitoringInterval = setInterval(() => {
      if (contentRef.current) {
        const currentHeight = contentRef.current.scrollHeight;
        // If height has changed significantly, update regardless of stability
        if (Math.abs(currentHeight - containerHeight) > 30) {
          console.log("Content height changed after stability, adjusting:", currentHeight);
          updateContainerHeight(currentHeight);
        }
      }
    }, 1000); // Check every second
    
    // Cleanup for the monitoring interval
    timers.push(setTimeout(() => {
      clearInterval(monitoringInterval);
    }, 60000)); // Monitor for up to a minute
    
    // Helper function to update container height
    const updateContainerHeight = (height: number) => {
      // Store the actual content height for reference
      setContentHeight(height);
      
      // For mobile: cap height at MAX_MOBILE_HEIGHT and enable scroll indicator if needed
      if (isMobileDevice.current) {
        const newHeight = Math.min(height + HEIGHT_PADDING, MAX_MOBILE_HEIGHT);
        console.log("Setting container height to (mobile):", newHeight);
        setContainerHeight(newHeight);
        
        // Show scroll indicator if content exceeds container
        if (height > MAX_MOBILE_HEIGHT - HEIGHT_PADDING) {
          setShowScrollIndicator(true);
        } else {
          setShowScrollIndicator(false);
        }
      } else {
        // For desktop: limited height to prevent infinite expansion in Brave
        const newHeight = Math.min(height + HEIGHT_PADDING, MAX_DESKTOP_HEIGHT);
        console.log("Setting container height to (desktop):", newHeight);
        setContainerHeight(newHeight);
        
        // Show scroll indicator if content exceeds container on desktop too
        if (height > MAX_DESKTOP_HEIGHT - HEIGHT_PADDING) {
          setShowScrollIndicator(true);
        } else {
          setShowScrollIndicator(false);
        }
      }
    };
    
    // Enhanced measurement function with gentler stability detection
    const updateHeight = () => {
      if (!contentRef.current) return;
      
      // Get the true content height by finding actual rendered elements
      let height = contentRef.current.scrollHeight;
      
      // Try to find the actual Viator content
      const viatorContent = contentRef.current.querySelector('[data-viator-widget], .viator-widget, [data-widget-id], [id^="viator"]');
      if (viatorContent && viatorContent.scrollHeight > 100) {
        actualContentRef.current = viatorContent as HTMLDivElement;
        height = viatorContent.scrollHeight;
      }
      
      console.log("Content height via measurement:", height + "px");
      
      // Record this height measurement for stability detection
      heightHistoryRef.current.push(height);
      
      // Only keep the last 5 measurements
      if (heightHistoryRef.current.length > 5) {
        heightHistoryRef.current.shift();
      }
      
      // Check if height has stabilized (with more allowance for variation)
      const isHeightStable = heightHistoryRef.current.length >= 3 && 
        heightHistoryRef.current.every(h => 
          Math.abs(h - heightHistoryRef.current[0]) < STABILITY_VARIANCE);
      
      // Update height if significant change detected or we haven't stabilized yet
      if (!isStabilized || Math.abs(height - containerHeight) > 15) {
        updateContainerHeight(height);
        
        // Update stability state if measurements are stable
        if (isHeightStable && !isStabilized && heightHistoryRef.current.length >= 3) {
          console.log("Widget height has stabilized at", height + HEIGHT_PADDING);
          setIsStabilized(true);
        }
      }
    };
    
    // Progressive measurement schedule with more measurements
    const measurementTimes = isMobileDevice.current ? 
      [100, 250, 500, 750, 1000, 1400, 1800, 2200, 2800, 3500, 4200] : // More for mobile
      [100, 300, 600, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000]; // Extended for desktop
    
    measurementTimes.forEach(delay => {
      const timer = setTimeout(() => {
        updateHeight();
      }, delay);
      timers.push(timer);
    });
    
    // Special handling for Viator widgets and iframes
    const checkViatorContent = () => {
      if (!contentRef.current) return;
      
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
    
    // Check for longer to catch lazy-loaded content
    const cleanupTimer = setTimeout(() => {
      clearInterval(checkInterval);
    }, 15000); // Extended from 5000
    
    timers.push(cleanupTimer);
    
    // Set up ResizeObserver for dynamic content changes
    try {
      observerRef = new ResizeObserver(() => {
        updateHeight();
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
  }, [containerHeight, isStabilized]);
  
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
          height: 'auto',
          maxHeight: '100%',
          overflowY: 'auto', // Always enable scrolling for both mobile and desktop
          overscrollBehavior: 'contain', // Prevent scroll chaining
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          contain: 'content', // Improve scroll containment
          paddingBottom: contentHeight > (isMobileDevice.current ? MAX_MOBILE_HEIGHT : MAX_DESKTOP_HEIGHT) - HEIGHT_PADDING ? '5px' : '0',
        }}
      >
        {children}
      </div>
      
      {/* Scroll indicator for both mobile and desktop */}
      {showScrollIndicator && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '30px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
            pointerEvents: 'none', // Allow clicks to pass through
            zIndex: 2,
            opacity: 0.9,
            boxShadow: '0 -3px 6px rgba(0,0,0,0.05)', // Subtle shadow to emphasize indicator
          }}
        />
      )}
    </div>
  );
};

export default ViatorAdaptiveContainer;
