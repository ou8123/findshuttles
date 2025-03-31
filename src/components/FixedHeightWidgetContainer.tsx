"use client";

import { ReactNode, useEffect, useRef } from 'react';

interface FixedHeightWidgetContainerProps {
  children: ReactNode;
  className?: string;
  height?: number;
}

/**
 * FixedHeightWidgetContainer
 * 
 * A container component that completely isolates its contents from the rest of the page.
 * Used to prevent widget content from causing scroll jitter and layout shifts.
 * This creates a fixed-height container with CSS isolation and scroll behavior controls.
 */
const FixedHeightWidgetContainer: React.FC<FixedHeightWidgetContainerProps> = ({
  children,
  className = '',
  height = 450, // Default fixed height
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply additional styles on mobile devices
  useEffect(() => {
    const isMobile = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (containerRef.current && isMobile) {
      // Add any mobile-specific initializations here
      document.documentElement.style.setProperty('--widget-container-height', `${height}px`);
      
      // Prevent scroll propagation from widget to page
      const preventPropagation = (e: WheelEvent) => {
        const container = containerRef.current;
        if (!container) return;
        
        // If at the top and scrolling up, or at the bottom and scrolling down, prevent propagation
        if ((container.scrollTop === 0 && e.deltaY < 0) ||
            (container.scrollHeight - container.scrollTop === container.clientHeight && e.deltaY > 0)) {
          e.preventDefault();
        }
      };
      
      containerRef.current.addEventListener('wheel', preventPropagation, { passive: false });
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('wheel', preventPropagation);
        }
      };
    }
  }, [height]);

  return (
    <div 
      ref={containerRef}
      className={`fixed-height-widget-container ${className}`}
      style={{
        height: `${height}px`,
        maxHeight: `${height}px`,
        overflowY: 'hidden',
        overflowX: 'hidden',
        position: 'relative',
        isolation: 'isolate', // Create a new stacking context
        contain: 'content', // Improve performance by isolating content
        touchAction: 'pan-y', // Allow only vertical touch scrolling
        overscrollBehavior: 'none', // Prevent bounce effects
        marginBottom: '40px',
        marginTop: '20px',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '8px',
        background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div className="widget-content" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
};

export default FixedHeightWidgetContainer;
