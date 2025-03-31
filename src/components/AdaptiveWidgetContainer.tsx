"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AdaptiveWidgetContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Simple Widget Container
 * 
 * A lightweight container that adapts to the exact height of its content without
 * any maximum height constraints or scrolling. Uses a simple and efficient approach
 * that works consistently across all devices.
 */
const AdaptiveWidgetContainer: React.FC<AdaptiveWidgetContainerProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(300); // Initial height just for rendering
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Core widget measurement logic - simpler, more direct approach
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Update height function
    const updateHeight = () => {
      if (!contentRef.current) return;
      
      // Use the most reliable height measurement
      const height = contentRef.current.scrollHeight;
      
      // Add a small buffer to prevent any scrolling (15px)
      setContainerHeight(height + 15);
    };
    
    // Create observer for content changes
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
      
      // Mark as loaded after first measurement
      if (!isLoaded) {
        setIsLoaded(true);
      }
    });
    
    // Also set up polling for slower-loading content
    const checkHeight = () => {
      updateHeight();
    };
    
    // Initial quick measurements
    updateHeight();
    setTimeout(updateHeight, 100);
    setTimeout(updateHeight, 300);
    setTimeout(updateHeight, 700);
    
    // Start observing size changes
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    
    // Check for slow-loading iframe content
    const iframeCheck = setInterval(() => {
      const iframes = contentRef.current?.querySelectorAll('iframe');
      let iframeLoading = false;
      
      if (iframes && iframes.length > 0) {
        // Add load listener to iframes
        iframes.forEach(iframe => {
          iframeLoading = true;
          try {
            iframe.addEventListener('load', checkHeight, { once: true });
          } catch (e) {
            // Silent fail for cross-origin restrictions
          }
        });
      }
      
      // If no iframes or they're all loaded, stop checking
      if (!iframeLoading) {
        clearInterval(iframeCheck);
      }
      
      // Always update height just in case
      updateHeight();
    }, 500);
    
    // Handle any window resize
    window.addEventListener('resize', updateHeight);
    
    // Clean up all listeners
    return () => {
      resizeObserver.disconnect();
      clearInterval(iframeCheck);
      window.removeEventListener('resize', updateHeight);
    };
  }, [isLoaded]);
  
  return (
    <div 
      ref={containerRef}
      className={`widget-container ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      style={{
        height: `${containerHeight}px`,
        transition: isLoaded ? 'height 0.2s ease-in-out' : 'none',
        position: 'relative',
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
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AdaptiveWidgetContainer;
