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
  
  // Fixed height constants with smaller values for better user experience
  const MOBILE_HEIGHT = 500;  // Reduced from 800px
  const DESKTOP_HEIGHT = 650; // Reduced from 1000px
  
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
        height: isMobile ? `${MOBILE_HEIGHT}px` : `${DESKTOP_HEIGHT}px`,
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
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
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
      
      {/* Scroll indicator */}
      {hasOverflow && (
        <div className="scroll-indicator-container">
          {/* Gradient fade at top when scrolled down */}
          <div 
            className="scroll-indicator top"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '24px',
              background: 'linear-gradient(to top, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 80%, rgba(255,255,255,1) 100%)',
              opacity: 0, // Start hidden, will be shown with JS when scrolled
              transition: 'opacity 0.2s',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
          
          {/* Gradient fade at bottom */}
          <div 
            className="scroll-indicator bottom"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40px', // Taller bottom indicator
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,1) 100%)',
              pointerEvents: 'none',
              zIndex: 5,
              boxShadow: '0 -3px 6px rgba(0,0,0,0.03)',
            }}
          />
          
          {/* Scroll indicator message for better UX - only on mobile */}
          {isMobile && (
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: '#666',
                fontSize: '13px',
                fontWeight: 500,
                zIndex: 6,
                pointerEvents: 'none',
                textShadow: '0 0 5px white, 0 0 5px white, 0 0 5px white',
                opacity: 0.9,
              }}
            >
              Scroll for more options
            </div>
          )}
        </div>
      )}
      
      {/* Script to show/hide top gradient based on scroll position */}
      {hasOverflow && (
        <script dangerouslySetInnerHTML={{ 
          __html: `
            (function() {
              const content = document.currentScript.parentNode.querySelector('.widget-content-area');
              const topIndicator = document.currentScript.parentNode.querySelector('.scroll-indicator.top');
              
              if (content && topIndicator) {
                content.addEventListener('scroll', function() {
                  if (content.scrollTop > 30) {
                    topIndicator.style.opacity = '1';
                  } else {
                    topIndicator.style.opacity = '0';
                  }
                });
              }
            })();
          `
        }} />
      )}
    </div>
  );
};

export default ViatorAdaptiveContainer;
