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
  delay = 300 
}) => {
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip on first server render
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Add class to mark the route as loaded via client navigation
    document.body.classList.add('route-loaded');
    
    // Auto-scroll to content section with a small delay
    const timer = setTimeout(() => {
      const element = document.querySelector(scrollToSelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        console.log('Auto-scrolled to content section');
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
