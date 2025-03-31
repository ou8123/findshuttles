"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AdaptiveWidgetContainerProps {
  children: ReactNode;
  className?: string;
  initialHeight?: number;
}

/**
 * Exact-Fit Widget Container
 * 
 * A container component that adapts to the EXACT height of its content.
 * Unlike other approaches, this container will expand to match content precisely
 * with no scrolling or height constraints.
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
  initialHeight = 200, // Just a starting point, will quickly adjust to actual content
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(initialHeight);
  const [measureAttempts, setMeasureAttempts] = useState(0);
  
  // Highly aggressive content measurement
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Track all timers for cleanup
    const timers: ReturnType<typeof setTimeout>[] = [];
    let observer: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let isComponentMounted = true;
    
    // Main measurement function - get most accurate height possible
    const measureContentHeight = () => {
      if (!contentRef.current || !isComponentMounted) return;

      // Get all possible height measurements and use the largest
      const element = contentRef.current;
      const scrollHeight = element.scrollHeight || 0;
      const offsetHeight = element.offsetHeight || 0;
      const clientHeight = element.clientHeight || 0;
      const boundingHeight = element.getBoundingClientRect().height || 0;
      
      // Check for all nested elements including iframes
      let maxNestedHeight = 0;
      const allElements = element.querySelectorAll('*');
      allElements.forEach(el => {
        // Include position offsets for absolute positioned elements
        const rect = el.getBoundingClientRect();
        const bottomPosition = rect.top + rect.height;
        if (bottomPosition > maxNestedHeight) {
          maxNestedHeight = bottomPosition;
        }
      });
      
      // Add a small buffer to prevent any chance of scrolling (10px)
      const bestHeightEstimate = Math.max(
        scrollHeight,
        offsetHeight,
        clientHeight,
        boundingHeight,
        maxNestedHeight - (element.getBoundingClientRect().top || 0)
      ) + 10;
      
      setContainerHeight(bestHeightEstimate);
    };
    
    // Poll content height aggressively during initial load
    // Starting with rapid measurements, then slowing down
    const setupPolling = () => {
      // Immediate measurement
      measureContentHeight();
      
      // Fast sequence of early measurements (captures most content)
      [50, 100, 250, 500, 1000].forEach((delay, i) => {
        const timer = setTimeout(() => {
          measureContentHeight();
          setMeasureAttempts(prev => prev + 1);
        }, delay);
        timers.push(timer);
      });
      
      // Additional measurements over time for slow-loading content
      [2000, 3000, 4000, 5000].forEach((delay) => {
        const timer = setTimeout(measureContentHeight, delay);
        timers.push(timer);
      });
      
      // Final fallback measurements
      const timer = setTimeout(measureContentHeight, 7000);
      timers.push(timer);
    };
    
    // Setup resize observer for dynamic changes
    const setupResizeObserver = () => {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === contentRef.current) {
            measureContentHeight();
          }
        }
      });
      
      if (contentRef.current) {
        observer.observe(contentRef.current);
      }
    };
    
    // Setup mutation observer to catch DOM changes
    const setupMutationObserver = () => {
      mutationObserver = new MutationObserver((mutations) => {
        // Only trigger for meaningful changes
        const shouldMeasure = mutations.some(mutation => 
          mutation.type === 'childList' || 
          (mutation.type === 'attributes' && 
           (mutation.attributeName === 'style' || 
            mutation.attributeName === 'class'))
        );
        
        if (shouldMeasure) {
          measureContentHeight();
        }
      });
      
      if (contentRef.current) {
        mutationObserver.observe(contentRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    };
    
    // Special handling for iframes
    const handleIframes = () => {
      const iframes = contentRef.current?.querySelectorAll('iframe');
      if (iframes && iframes.length > 0) {
        iframes.forEach(iframe => {
          // Try to add load event if possible
          try {
            iframe.addEventListener('load', measureContentHeight);
          } catch (e) {
            // Silently fail - cross-origin restrictions
          }
        });
      }
    };
    
    // Initialize all measurement strategies
    setupPolling();
    setupResizeObserver();
    setupMutationObserver();
    handleIframes();
    
    // Additional special case for window resize
    const handleWindowResize = () => {
      measureContentHeight();
    };
    window.addEventListener('resize', handleWindowResize);
    
    // Cleanup
    return () => {
      isComponentMounted = false;
      timers.forEach(timer => clearTimeout(timer));
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      
      const iframes = contentRef.current?.querySelectorAll('iframe');
      if (iframes && iframes.length > 0) {
        iframes.forEach(iframe => {
          try {
            iframe.removeEventListener('load', measureContentHeight);
          } catch (e) {
            // Silently fail
          }
        });
      }
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`adaptive-widget-container ${className}`}
      style={{
        height: `${containerHeight}px`,
        position: 'relative',
        overflow: 'visible', // Allow content to overflow
        transition: 'height 0.15s ease-out', // Smooth height changes
        margin: '1rem 0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        background: '#fff',
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
          height: 'auto', // Let content determine height
          overflow: 'visible', // No scrolling, full height display
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AdaptiveWidgetContainer;
