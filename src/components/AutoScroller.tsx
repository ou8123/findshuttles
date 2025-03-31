"use client";

import { useEffect, useRef } from 'react';

interface AutoScrollerProps {
  children: React.ReactNode;
  scrollToSelector: string;
  delay?: number;
}

/**
 * AutoScroller Component
 * 
 * A client component that auto-scrolls to a specific element after mounting.
 * This is used by the server-rendered route page to maintain the auto-scroll
 * behavior without converting the entire page to a client component.
 */
const AutoScroller: React.FC<AutoScrollerProps> = ({ 
  children, 
  scrollToSelector,
  delay = 600 // Increased default delay to allow for widget load
}) => {
  const mountedRef = useRef(false);
  const scrollAttemptedRef = useRef(false);
  
  // Determine if we're on a mobile device for different scroll behavior
  const isMobile = typeof window !== 'undefined' && 
    (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  useEffect(() => {
    // Skip on first server render and if we've already attempted scrolling
    if (mountedRef.current || scrollAttemptedRef.current) return;
    mountedRef.current = true;
    
    // Mark as loaded via client navigation
    document.body.classList.add('route-loaded');
    
    // Function to check if the content is ready for scrolling
    const checkContentReady = () => {
      const element = document.querySelector(scrollToSelector);
      const widget = document.querySelector('.viator-widget-container');
      
      // Skip if either element is missing
      if (!element) return false;
      
      // If no widget exists, we can scroll immediately
      if (!widget) return true;
      
      // For pages with widgets, wait until height stabilizes
      const iframe = widget.querySelector('iframe');
      return iframe && iframe.style.height && parseInt(iframe.style.height) > 250;
    };
    
    // Auto-scroll with more intelligent delay and stability checks
    const timer = setTimeout(() => {
      scrollAttemptedRef.current = true;
      
      if (checkContentReady()) {
        const element = document.querySelector(scrollToSelector);
        if (element) {
          // Use different scroll behavior for mobile vs desktop
          element.scrollIntoView({ 
            behavior: isMobile ? 'auto' : 'smooth',
            block: 'start' 
          });
          console.log('Auto-scrolled to content section');
        }
      } else {
        // If content not ready, try once more after an additional delay
        const retryTimer = setTimeout(() => {
          const element = document.querySelector(scrollToSelector);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'auto', 
              block: 'start' 
            });
          }
        }, 1000);
        
        return () => clearTimeout(retryTimer);
      }
    }, delay);
    
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('route-loaded');
    };
  }, [scrollToSelector, delay]);

  return <>{children}</>;
};

export default AutoScroller;
