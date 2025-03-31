"use client";

import { useEffect, useRef, useState } from 'react';

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
 * 
 * The component respects user interaction and will not scroll once a user
 * has manually scrolled or touched the screen.
 */
const AutoScroller: React.FC<AutoScrollerProps> = ({ 
  children, 
  scrollToSelector,
  delay = 600 // Default delay to allow for widget load
}) => {
  const mountedRef = useRef(false);
  const scrollAttemptedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  // Setup user interaction tracking
  useEffect(() => {
    const handleUserInteraction = () => {
      userInteractedRef.current = true;
      setUserHasScrolled(true);
    };

    // Track all forms of user interaction that might indicate they want to control scrolling
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('mousewheel', handleUserInteraction, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('mousewheel', handleUserInteraction);
    };
  }, []);

  // Handle auto-scrolling effect
  useEffect(() => {
    // Skip on first server render or if already attempted scroll
    if (mountedRef.current || scrollAttemptedRef.current) return;
    mountedRef.current = true;
    
    // Mark as loaded via client navigation
    document.body.classList.add('route-loaded');
    
    // Function to check if content is ready
    const checkContentReady = () => {
      // Respect user interaction - don't auto-scroll if user has interacted
      if (userInteractedRef.current) {
        console.log('User has interacted - skipping auto-scroll');
        return false;
      }
      
      const element = document.querySelector(scrollToSelector);
      return !!element;
    };
    
    // Auto-scroll with respect for user interaction
    const timer = setTimeout(() => {
      scrollAttemptedRef.current = true;
      
      // Only scroll if user hasn't taken control
      if (userInteractedRef.current) {
        console.log('Auto-scroll skipped - user already interacted');
        return;
      }
      
      if (checkContentReady()) {
        const element = document.querySelector(scrollToSelector);
        if (element) {
          // Scroll with consistent behavior
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start' 
          });
          console.log('Auto-scrolled to content section');
        }
      }
    }, delay);
    
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('route-loaded');
    };
  }, [scrollToSelector, delay]);

  return (
    <div className={`content-wrapper ${userHasScrolled ? 'user-scrolled' : ''}`} style={{
      // Using CSS to improve scrolling but not interfering with layout
      scrollBehavior: 'smooth',
      overscrollBehavior: 'none',
    }}>
      {children}
    </div>
  );
};

export default AutoScroller;
