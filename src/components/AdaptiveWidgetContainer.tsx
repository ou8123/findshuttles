"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AdaptiveWidgetContainerProps {
  children: ReactNode;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * AdaptiveWidgetContainer
 * 
 * A container component that adapts to its content while maintaining stability.
 * Unlike a fixed height container, this observes content size changes and
 * smoothly adjusts its height while preventing layout thrashing.
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
  minHeight = 380,
  maxHeight = 1000,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(minHeight);
  const [isStabilized, setIsStabilized] = useState(false);
  
  // Setup resize observation for the content
  useEffect(() => {
    if (!contentRef.current) return;
    
    let stabilityTimeout: ReturnType<typeof setTimeout>;
    let initialMeasureTimeout: ReturnType<typeof setTimeout>;
    let consecutiveStableMeasurements = 0;

    // Init ResizeObserver to watch content size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Skip if we've already determined stability
        if (isStabilized) return;
        
        // Get content height from observer
        const contentHeight = entry.contentRect.height;
        
        // Apply constraints
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight, contentHeight + 20) // Add small padding
        );
        
        // Smoothly update container height
        if (Math.abs(newHeight - containerHeight) > 10) {
          // Reset stability counter if significant change
          consecutiveStableMeasurements = 0;
          setContainerHeight(newHeight);
        } else {
          // Count stability measurements
          consecutiveStableMeasurements++;
          
          // If stable for several measurements, finalize height
          if (consecutiveStableMeasurements >= 3) {
            setIsStabilized(true);
            setContainerHeight(newHeight);
          }
        }
      }
    });
    
    // Initialize with a slight delay to allow initial render
    initialMeasureTimeout = setTimeout(() => {
      resizeObserver.observe(contentRef.current!);
    }, 300);
    
    // Set timeout to stabilize after reasonable time regardless of measurements
    stabilityTimeout = setTimeout(() => {
      if (!isStabilized && contentRef.current) {
        const height = contentRef.current.offsetHeight;
        setContainerHeight(Math.max(minHeight, Math.min(maxHeight, height + 20)));
        setIsStabilized(true);
      }
    }, 3000); // Finalize height after 3 seconds max
    
    return () => {
      resizeObserver.disconnect();
      clearTimeout(stabilityTimeout);
      clearTimeout(initialMeasureTimeout);
    };
  }, [containerHeight, minHeight, maxHeight, isStabilized]);
  
  return (
    <div 
      ref={containerRef}
      className={`adaptive-widget-container ${className} ${isStabilized ? 'stable' : 'adapting'}`}
      style={{
        height: `${containerHeight}px`,
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'height 0.3s ease', // Smooth height changes
        contain: 'layout', // Improve performance with containment
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
          height: '100%',
          overflowY: 'hidden',
          overscrollBehavior: 'none', // Prevent bounce effects
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AdaptiveWidgetContainer;
