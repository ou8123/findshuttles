"use client";

import { ReactNode } from 'react';

interface AutoScrollerProps {
  children: ReactNode;
  scrollToSelector?: string; // Kept for API compatibility but not used
  delay?: number; // Kept for API compatibility but not used
}

/**
 * AutoScroller Component - DISABLED VERSION
 * 
 * This component has been completely stripped of all auto-scrolling functionality
 * to eliminate scrolling conflicts and ensure a stable mobile experience.
 * It now simply renders its children without any scroll intervention.
 * 
 * NOTE: We keep the same API (props) for backward compatibility, but they are not used.
 */
const AutoScroller: React.FC<AutoScrollerProps> = ({ 
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scrollToSelector,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delay 
}) => {
  // No hooks, no effects, no auto-scrolling logic
  // This component now just renders its children with a CSS class for styling

  return (
    <div className="scrollable-content" style={{ 
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(0,0,0,0.2) transparent',
      overscrollBehavior: 'none', // Prevent browser bounce effects
    }}>
      {children}
    </div>
  );
};

export default AutoScroller;
