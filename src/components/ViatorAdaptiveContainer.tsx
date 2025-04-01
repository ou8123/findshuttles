"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface ViatorAdaptiveContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Viator Controlled Container
 * 
 * A simplified, strictly controlled container component for Viator widgets that:
 * - Uses fixed height constraints based on device type
 * - Provides clear, purposeful scrolling for content overflow
 * - Maintains visual consistency across devices
 * - Implements an obvious scroll indicator for better UX
 * - Optimizes for mobile viewing
 */
const ViatorAdaptiveContainer: React.FC<ViatorAdaptiveContainerProps> = ({
  children,
  className = '',
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [initialContentChecked, setInitialContentChecked] = useState(false);
  
  // Detect device type once on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkMobile();
    
    // Also listen for orientation changes and window resizes
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Simplified content overflow detection
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Check if content overflows the container
    const checkOverflow = () => {
      if (contentRef.current) {
        const hasContentOverflow = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setHasOverflow(hasContentOverflow);
        
        if (!initialContentChecked) {
          setInitialContentChecked(true);
        }
      }
    };
    
    // Run initial check
    checkOverflow();
    
    // Set up simple sampling to check for overflow as content loads
    const timers = [500, 1000, 2000, 3000, 5000].map(delay => 
      setTimeout(checkOverflow, delay)
    );
    
    // Check for iframes and handle their load events
    const iframes = contentRef.current.querySelectorAll('iframe');
    const iframeLoadHandlers: { iframe: HTMLIFrameElement, handler: () => void }[] = [];
    
    iframes.forEach(iframe => {
      const handler = () => {
        // Check for overflow after iframe loads
        checkOverflow();
        
        // Check again after a delay to account for post-load content adjustments
        setTimeout(checkOverflow, 500);
      };
      
      iframe.addEventListener('load', handler);
      iframeLoadHandlers.push({ iframe, handler });
    });
    
    // Handle visibility changes (e.g., returning to tab)
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        checkOverflow();
      }
    };
    
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Clean up all event listeners and timers
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      iframeLoadHandlers.forEach(({ iframe, handler }) => {
        iframe.removeEventListener('load', handler);
      });
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [initialContentChecked]);
  
  return (
    <div 
      className={`viator-fixed-container ${className}`}
      style={{
        position: 'relative',
        height: 'auto',
        margin: '1rem 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '8px',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Content area with scroll */}
      <div 
        ref={contentRef}
        className="widget-content-area"
        style={{
          position: 'relative',
          width: '100%',
          height: 'auto',
          overflowY: 'visible',
          overflowX: 'hidden',
          overscrollBehavior: 'contain', // Prevent scroll chaining
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          padding: '0 0 10px 0', // Add padding at bottom for better scroll experience
          scrollbarWidth: 'thin', // Thin scrollbar for Firefox
          scrollbarColor: '#c1c1c1 #f1f1f1', // Scrollbar colors for Firefox
        }}
      >
        {children}
      </div>
      
      {/* Removed scroll indicators since we're using auto-height */}
      
    </div>
  );
};

export default ViatorAdaptiveContainer;
