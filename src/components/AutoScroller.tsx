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

  // Track user scroll state to prevent programmatic scrolling after user interaction
  const userHasScrolledRef = useRef(false);

  useEffect(() => {
    // Track user scrolling to prevent interrupting their experience
    const handleUserScroll = () => {
      userHasScrolledRef.current = true;
    };

    // Add scroll listener
    window.addEventListener('scroll', handleUserScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleUserScroll);
    };
  }, []);

  useEffect(() => {
    // Skip on first server render, if we've already attempted scrolling, or on mobile devices
    if (mountedRef.current || scrollAttemptedRef.current) return;
    mountedRef.current = true;
    
    // Mark as loaded via client navigation
    document.body.classList.add('route-loaded');
    
    // Early exit for mobile devices - disable auto-scrolling completely
    if (isMobile) {
      console.log('Auto-scroll disabled on mobile device');
      return;
    }
    
    // Function to check if the content is ready for scrolling
    const checkContentReady = () => {
      // If user has scrolled, respect their input and don't auto-scroll
      if (userHasScrolledRef.current) {
        console.log('User has scrolled - cancelling auto-scroll');
        return false;
      }
      
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
    // Use a longer delay to give widget more time to stabilize
    const timer = setTimeout(() => {
      scrollAttemptedRef.current = true;
      
      // Skip if user has scrolled manually
      if (userHasScrolledRef.current) {
        console.log('Auto-scroll skipped - user already scrolled');
        return;
      }
      
      if (checkContentReady()) {
        const element = document.querySelector(scrollToSelector);
        if (element) {
          // Use smooth scrolling for desktop only
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start' 
          });
          console.log('Auto-scrolled to content section');
        }
      } else {
        // If content not ready and user hasn't scrolled, try once more after an additional delay
        const retryTimer = setTimeout(() => {
          // Skip retry if user has scrolled manually
          if (userHasScrolledRef.current) {
            console.log('Auto-scroll retry skipped - user already scrolled');
            return;
          }
          
          const element = document.querySelector(scrollToSelector);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 1000);
        
        return () => clearTimeout(retryTimer);
      }
    }, delay > 600 ? delay : 1200); // Minimum 1200ms delay to allow widget to stabilize
    
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('route-loaded');
    };
  }, [scrollToSelector, delay]);

  return <>{children}</>;
};

export default AutoScroller;
