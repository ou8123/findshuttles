"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AdaptiveWidgetContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: number | string;
}

/**
 * Universal Adaptive Widget Container - Mobile Optimized
 * 
 * A streamlined container component that adapts to match content height
 * with enhanced mobile capabilities to prevent endless scrolling:
 * - Uses viewport-based sizing to prevent excessive white space
 * - Implements strict height caps with improved internal scrolling
 * - Includes visual scroll indicators for better mobile UX
 * - Uses content-aware height calculation with history-based stabilization
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
  maxHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const heightHistoryRef = useRef<number[]>([]);
  
  // Start with a sensible initial height
  const [containerHeight, setContainerHeight] = useState(220);
  const [contentHeight, setContentHeight] = useState(0);
  const [isStabilized, setIsStabilized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // Constants for mobile optimization
  const MOBILE_MAX_HEIGHT = typeof maxHeight !== 'undefined' 
    ? maxHeight 
    : '65vh'; // Use viewport height for responsive sizing
  const DEFAULT_DESKTOP_HEIGHT = typeof maxHeight !== 'undefined'
    ? (typeof maxHeight === 'string' ? maxHeight : `${maxHeight}px`)
    : 'auto';
  const STABILITY_VARIANCE = 15; // Allow this much variance for stability
  const FORCE_STABILITY_TIMEOUT = 2500; // Force stability after this time
  const HEIGHT_PADDING = 15; // Small padding to avoid internal scroll bars
  
  // Mobile detection on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkMobile();
    
    // Media query for responsive changes
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
  
  // Enhanced height management
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Cleanup references
    let observerRef: ResizeObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    // Helper to calculate viewport-relative size
    const getViewportMaxHeight = (): number => {
      if (typeof MOBILE_MAX_HEIGHT === 'string' && MOBILE_MAX_HEIGHT.endsWith('vh')) {
        const vhValue = parseFloat(MOBILE_MAX_HEIGHT);
        return (window.innerHeight * vhValue) / 100;
      }
      return typeof MOBILE_MAX_HEIGHT === 'number' ? MOBILE_MAX_HEIGHT : 450;
    };
    
    // Enhanced update function with stability tracking
    const updateHeight = () => {
      if (!contentRef.current) return;
      
      // Get the actual content height
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      
      // Record this height for stability detection
      heightHistoryRef.current.push(height);
      if (heightHistoryRef.current.length > 4) heightHistoryRef.current.shift();
      
      // Check for stability (all measurements within variance range)
      const isHeightStable = heightHistoryRef.current.length >= 3 && 
        heightHistoryRef.current.every(h => 
          Math.abs(h - heightHistoryRef.current[0]) < STABILITY_VARIANCE);
      
      // For mobile: enforce strict height cap
      if (isMobile) {
        const maxViewportHeight = getViewportMaxHeight();
        const newHeight = Math.min(height + HEIGHT_PADDING, maxViewportHeight);
        
        // Show scroll indicator when content exceeds container
        setShowScrollIndicator(height > maxViewportHeight - HEIGHT_PADDING);
        
        // Only update if significant change
        if (Math.abs(newHeight - containerHeight) > 5) {
          setContainerHeight(newHeight);
        }
      } else {
        // For desktop: allow content to determine height
        const newHeight = height + HEIGHT_PADDING;
        if (Math.abs(newHeight - containerHeight) > 5) {
          setContainerHeight(newHeight);
        }
      }
      
      // Update stability state
      if (isHeightStable && !isStabilized && heightHistoryRef.current.length >= 3) {
        setIsStabilized(true);
      }
    };
    
    // Force stability after timeout
    const initialStabilityTimer = setTimeout(() => {
      if (!isStabilized) {
        setIsStabilized(true);
      }
    }, FORCE_STABILITY_TIMEOUT);
    timers.push(initialStabilityTimer);
    
    // Progressive measurement schedule
    const measurementTimes = [100, 300, 600, 1000, 1500, 2000];
    measurementTimes.forEach(delay => {
      const timer = setTimeout(updateHeight, delay);
      timers.push(timer);
    });
    
    // Set up ResizeObserver for content changes
    try {
      observerRef = new ResizeObserver(() => {
        requestAnimationFrame(updateHeight);
      });
      
      if (contentRef.current) {
        observerRef.observe(contentRef.current);
      }
    } catch (e) {
      // Fallback with less aggressive polling
      const pollingInterval = setInterval(updateHeight, 750);
      const pollingCleanup = setTimeout(() => clearInterval(pollingInterval), 3000);
      timers.push(pollingCleanup);
    }
    
    // Debounced window resize handler
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      // Reset stability on resize
      if (isStabilized) {
        setIsStabilized(false);
        heightHistoryRef.current = [];
      }
      
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateHeight();
      }, 200);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(updateHeight, 100);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Special handling for dynamic content changes
    const monitoringInterval = setInterval(() => {
      if (contentRef.current) {
        const currentHeight = contentRef.current.scrollHeight;
        if (Math.abs(currentHeight - contentHeight) > 25) {
          updateHeight();
        }
      }
    }, 1000);
    
    // Clean up monitoring after a reasonable time
    const monitoringCleanup = setTimeout(() => clearInterval(monitoringInterval), 5000);
    timers.push(monitoringCleanup);
    
    // Complete cleanup
    return () => {
      observerRef?.disconnect();
      timers.forEach(timer => clearTimeout(timer));
      clearInterval(monitoringInterval);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [containerHeight, isStabilized, isMobile, MOBILE_MAX_HEIGHT, contentHeight]);
  
  return (
    <div 
      ref={containerRef}
      className={`widget-container ${className}`}
      style={{
        height: isMobile ? `${containerHeight}px` : DEFAULT_DESKTOP_HEIGHT,
        position: 'relative',
        transition: isStabilized ? 'height 0.2s ease-out' : 'none',
        margin: '1rem 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '8px',
        background: '#fff',
        overflow: 'hidden',
        maxHeight: isMobile ? (typeof MOBILE_MAX_HEIGHT === 'string' ? MOBILE_MAX_HEIGHT : `${MOBILE_MAX_HEIGHT}px`) : 'none',
      }}
    >
      <div 
        ref={contentRef}
        className="widget-content"
        style={{
          position: isMobile ? 'relative' : 'relative', // Changed from absolute
          top: 0,
          left: 0,
          width: '100%',
          ...(isMobile ? {
            maxHeight: '100%',
            overflowY: showScrollIndicator ? 'auto' : 'visible',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          } : {})
        }}
      >
        {children}
      </div>
      
      {/* Scroll indicator for mobile */}
      {isMobile && showScrollIndicator && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '25px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
            opacity: 0.9,
          }}
        />
      )}
    </div>
  );
};

export default AdaptiveWidgetContainer;
