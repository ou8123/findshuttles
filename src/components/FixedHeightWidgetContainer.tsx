"use client";

import { ReactNode } from 'react';

interface FixedHeightWidgetContainerProps {
  children: ReactNode;
  className?: string;
  height?: number;
}

/**
 * Fixed Height Widget Container
 * 
 * A simple container with fixed height for cases where exact sizing is needed.
 * Redirects to AdaptiveWidgetContainer for consistency.
 */
const FixedHeightWidgetContainer: React.FC<FixedHeightWidgetContainerProps> = ({
  children,
  className = '',
  height = 450,
}) => {
  return (
    <div 
      className={`fixed-height-widget-container ${className}`}
      style={{
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        margin: '1rem 0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        background: '#fff',
      }}
    >
      <div 
        className="widget-content"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FixedHeightWidgetContainer;
