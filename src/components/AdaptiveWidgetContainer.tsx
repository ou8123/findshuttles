"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AdaptiveWidgetContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: number;
}

/**
 * Universal Adaptive Widget Container - Performance Optimized
 * 
 * A streamlined container component that adapts to match the height
 * of its content with optimizations for performance and mobile usability:
 * - Respects maximum height constraint for mobile viewports
 * - Reduced polling frequency and duration
 * - Better cleanup of resources
 * - Handles content overflow properly
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
  maxHeight = 800, // Apply a reasonable max height for mobile
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Start with a modest initial height
  const [containerHeight, setContainerHeight] = useState(250);
  const [isStabilized, setIsStabilized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile devices once on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    
    // Only add event listener if needed
    const mql = window.matchMedia('(max-width: 767px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    
    // Use modern event listener if available, fallback for older browsers
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    } else if (typeof mql.addListener === 'function') {
      // @ts-ignore - Older browser support
      mql.addListener(handleChange);
      return () => {
        // @ts-ignore - Older browser support
        mql.removeListener(handleChange);
      };
    }
  }, []);
  
  // Setup measurement to get content height - with reduced polling
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Clean up references
    let observerRef: ResizeObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    // Simple measurement function that uses scrollHeight
    const updateHeight = () => {
      if (!contentRef.current) return;
      
      // Get the exact scrollHeight
      const height = contentRef.current.scrollHeight;
      
      // Apply maxHeight constraint on mobile
      const constrainedHeight = isMobile ? Math.min(height, maxHeight) : height;
      
      // Only update if there's a meaningful difference to avoid loops
      if (Math.abs(constrainedHeight - containerHeight) > 5) {
        setContainerHeight(constrainedHeight);
      }
    };
    
    // Initialize with immediate measurement
    updateHeight();
    
    // Reduced number of measurement timers - just two strategic ones
    timers.push(setTimeout(updateHeight, 100));
    
    // Create one stable timer that marks the component as stabilized
    const stabilityTimer = setTimeout(() => {
      updateHeight();
      setIsStabilized(true);
    }, 500); // Reduced from 700ms
    timers.push(stabilityTimer);
    
    // Set up ResizeObserver for dynamic content changes
    try {
      observerRef = new ResizeObserver(() => {
        requestAnimationFrame(updateHeight); // Use requestAnimationFrame for smoother updates
      });
      
      if (contentRef.current) {
        observerRef.observe(contentRef.current);
      }
    } catch (e) {
      // Fallback for browsers without ResizeObserver - less aggressive polling
      const pollingInterval = setInterval(updateHeight, 500); // Increased interval from 300ms
      
      // Stop polling sooner
      const cleanupTimer = setTimeout(() => {
        clearInterval(pollingInterval);
      }, 2000); // Reduced from 5000ms
      
      timers.push(cleanupTimer);
      
      return () => {
        clearInterval(pollingInterval);
      };
    }
    
    // Handle window resize events with debounce for better performance
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateHeight, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up all observers and timers
    return () => {
      observerRef?.disconnect();
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [containerHeight, isMobile, maxHeight]);
  
  return (
    <div 
      ref={containerRef}
      className={`widget-container ${className}`}
      style={{
        height: `${containerHeight}px`,
        position: 'relative',
        transition: isStabilized ? 'height 0.15s ease-out' : 'none',
        margin: '1rem 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '8px',
        background: '#fff',
        overflow: 'hidden',
        // Add max-height constraint with overflow for mobile
        ...(isMobile && {
          maxHeight: `${maxHeight}px`,
        })
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
          // Add overflow handling for mobile
          ...(isMobile && containerHeight >= maxHeight ? {
            height: '100%',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch', // Better scrolling on iOS
          } : {})
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AdaptiveWidgetContainer;
