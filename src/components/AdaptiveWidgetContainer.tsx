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
 * 
 * Now with optimized speed and device-specific adjustments.
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
  minHeight, // Allow override but use sensible defaults
  maxHeight, // Allow override but use sensible defaults
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isStabilized, setIsStabilized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile devices
  useEffect(() => {
    // Check if we're on a mobile device
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    // Initial check
    checkMobile();
    
    // Re-check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Determine device-specific settings
  const deviceMinHeight = minHeight || (isMobile ? 450 : 380);  
  const deviceMaxHeight = maxHeight || (isMobile ? 600 : 520); // Much more conservative max heights
  const heightPadding = isMobile ? 40 : 10; // More padding on mobile, but not too much
  const transitionSpeed = '0.15s'; // Fast transitions for both
  
  // Set initial height
  useEffect(() => {
    setContainerHeight(deviceMinHeight);
  }, [deviceMinHeight, isMobile]); 

  // Setup resize observation for the content
  useEffect(() => {
    if (!contentRef.current) return;
    
    let stabilityTimeout: ReturnType<typeof setTimeout>;
    let initialMeasureTimeout: ReturnType<typeof setTimeout>;
    
    // Immediately take an initial measurement for faster startup
    const immediateHeight = contentRef.current.scrollHeight;
    if (immediateHeight > 0) {
      // Use the lower of content height or max height + a small buffer
      const constrainedHeight = Math.max(
        deviceMinHeight,
        Math.min(deviceMaxHeight, Math.min(immediateHeight + heightPadding, 500))
      );
      setContainerHeight(constrainedHeight);
    }

    // Init ResizeObserver to watch content size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Get content height (use scrollHeight as backup)
        const contentHeight = entry.contentRect.height || entry.target.scrollHeight;
        
        // Apply strict height constraint
        const newHeight = Math.max(
          deviceMinHeight,
          Math.min(deviceMaxHeight, contentHeight + heightPadding) 
        );
        
        // Update if there's a significant difference
        if (Math.abs(newHeight - containerHeight) > 20) {
          setContainerHeight(newHeight);
        }
        
        // Stabilize quickly for all devices
        if (!isStabilized) {
          setIsStabilized(true);
        }
      }
    });
    
    // Initialize with minimal delay
    initialMeasureTimeout = setTimeout(() => {
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }
    }, 50); // Much faster initial delay
    
    // Set timeout to stabilize quickly regardless of measurements
    stabilityTimeout = setTimeout(() => {
      if (!isStabilized && contentRef.current) {
        // Take final measurement before stabilizing
        const height = contentRef.current.scrollHeight;
        const constrainedHeight = Math.max(
          deviceMinHeight, 
          Math.min(deviceMaxHeight, Math.min(height + heightPadding, 500))
        );
        setContainerHeight(constrainedHeight);
        setIsStabilized(true);
      }
    }, 800); // Quick stabilization
    
    return () => {
      resizeObserver.disconnect();
      clearTimeout(stabilityTimeout);
      clearTimeout(initialMeasureTimeout);
    };
  }, [containerHeight, deviceMinHeight, deviceMaxHeight, heightPadding, isStabilized]);
  
  return (
    <div 
      ref={containerRef}
      className={`adaptive-widget-container ${className} ${isStabilized ? 'stable' : 'adapting'}`}
      style={{
        height: `${containerHeight}px`,
        minHeight: `${deviceMinHeight}px`,
        maxHeight: `${deviceMaxHeight}px`,
        position: 'relative',
        overflow: 'hidden',
        transition: `height ${transitionSpeed} ease-out`, // Faster transitions
        contain: 'content', // Better containment mode
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
          overflowY: 'auto', // Always enable scrolling for overflow content
          overscrollBehavior: 'none', // Prevent bounce effects
          WebkitOverflowScrolling: 'touch', // Better scrolling on iOS
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AdaptiveWidgetContainer;
