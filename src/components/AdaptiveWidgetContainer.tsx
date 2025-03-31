"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AdaptiveWidgetContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Universal Adaptive Widget Container
 * 
 * A streamlined container component that adapts to exactly match the height
 * of its content across all devices without over-expansion.
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Start with a modest initial height
  const [containerHeight, setContainerHeight] = useState(250);
  
  // Track loading state to handle transitions properly
  const [isStabilized, setIsStabilized] = useState(false);
  
  // Setup one-time measurement to get exact content height
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Clean up references
    let observerRef: ResizeObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    // Simple measurement function that uses scrollHeight directly
    const updateHeight = () => {
      if (!contentRef.current) return;
      
      // Get the exact scrollHeight which is the most reliable cross-platform
      const height = contentRef.current.scrollHeight;
      
      // Only update if there's a meaningful difference to avoid loops
      if (Math.abs(height - containerHeight) > 5) {
        setContainerHeight(height);
      }
    };
    
    // Initialize with immediate measurement
    updateHeight();
    
    // Add quick measurements for content that loads fast
    const quickTimers = [50, 150, 300].map(delay => {
      const timer = setTimeout(() => {
        updateHeight();
      }, delay);
      timers.push(timer);
      return timer;
    });
    
    // Create one stable timer that marks the component as stabilized
    const stabilityTimer = setTimeout(() => {
      updateHeight();
      setIsStabilized(true);
    }, 700);
    timers.push(stabilityTimer);
    
    // Set up ResizeObserver for dynamic content changes
    try {
      observerRef = new ResizeObserver(() => {
        // Don't use entry dimensions as they're unreliable
        // Instead directly measure the content
        updateHeight();
      });
      
      if (contentRef.current) {
        observerRef.observe(contentRef.current);
      }
    } catch (e) {
      console.warn('ResizeObserver not available, using polling fallback');
    }
    
    // Polling fallback for browsers without ResizeObserver
    // Also helps catch async content loads
    const pollingInterval = setInterval(() => {
      updateHeight();
    }, 300);
    
    // Special handling for iframes since they're common in widgets
    const checkIframes = () => {
      if (!contentRef.current) return;
      
      const iframes = contentRef.current.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          // Try to add load listeners to all iframes
          iframe.addEventListener('load', () => {
            // When iframe loads, update immediately and after a small delay
            updateHeight();
            setTimeout(updateHeight, 200);
          });
        } catch (e) {
          // Silent fail for cross-origin restrictions
        }
      });
    };
    
    // Check for iframes now and periodically
    checkIframes();
    const iframeCheckInterval = setInterval(checkIframes, 500);
    
    // Stop polling and checking once component is stabilized
    const cleanupTimer = setTimeout(() => {
      clearInterval(pollingInterval);
      clearInterval(iframeCheckInterval);
    }, 5000); // Stop all polling after 5 seconds
    
    timers.push(cleanupTimer);
    
    // Handle window resize events
    const handleResize = () => updateHeight();
    window.addEventListener('resize', handleResize);
    
    // Clean up all observers and timers
    return () => {
      observerRef?.disconnect();
      timers.forEach(timer => clearTimeout(timer));
      clearInterval(pollingInterval);
      clearInterval(iframeCheckInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerHeight]);
  
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
          // No height or overflow constraints
          // Let content determine exact size
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AdaptiveWidgetContainer;
