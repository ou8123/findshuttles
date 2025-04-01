"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';

interface ViatorAspectContainerProps {
  children: ReactNode;
  className?: string;
  // Default aspect ratio is 16:9 (width:height)
  aspectRatio?: number;
  // Maximum height constraints
  maxHeight?: number;
  // Additional styling props
  style?: React.CSSProperties;
}

/**
 * ViatorAspectContainer
 * 
 * A container component that uses the aspect ratio pattern to create 
 * consistently sized widgets that scale properly across screen sizes.
 * 
 * Features:
 * - Uses aspect ratio for proper scaling without scrollbars
 * - Supports modern browsers with aspect-ratio property
 * - Falls back to padding-based aspect ratio for older browsers
 * - Adds constraints to handle unusually sized content
 * - Optimizes for both mobile and desktop
 */
const ViatorAspectContainer: React.FC<ViatorAspectContainerProps> = ({
  children,
  className = '',
  aspectRatio = 16/9, // Default aspect ratio (width/height)
  maxHeight = 800,
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Calculate padding percentage based on aspect ratio
  // For a 16:9 aspect ratio: (9 / 16) * 100 = 56.25%
  const paddingPercentage = (1 / aspectRatio) * 100;
  
  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    // Initialize on mount
    checkMobile();
    
    // Update on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Adjust max height for mobile
  const adjustedMaxHeight = isMobile ? Math.min(600, maxHeight) : maxHeight;
  
  return (
    <div 
      ref={containerRef}
      className={`viator-aspect-container ${className}`}
      style={{
        // Container styling
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.1)',
        background: '#fff',
        
        // Modern browsers - use aspect-ratio property 
        aspectRatio: `${aspectRatio}/1`,
        
        // Maximum height constraint - prevents overly tall containers
        maxHeight: `${adjustedMaxHeight}px`,
        
        // Merge with any custom styles passed to the component
        ...style,
      }}
    >
      {/* Fallback for browsers that don't support aspect-ratio */}
      <div
        style={{
          // This technique works by creating a div with a percentage-based padding bottom
          // The percentage is calculated from the aspect ratio (height/width * 100)
          paddingBottom: `${paddingPercentage}%`,
          position: 'relative',
          height: 0,
          width: '100%',
          // Hide this spacer if the browser supports aspect-ratio
          display: 'var(--aspect-ratio-supported, block)',
        }}
      />
      
      {/* Content container */}
      <div
        style={{
          // For browsers that support aspect-ratio, this becomes the main container
          // For browsers that don't, this becomes an absolutely positioned container
          position: 'absolute' as any,
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      
      {/* CSS feature detection for aspect-ratio support */}
      <style jsx global>{`
        @supports (aspect-ratio: 1 / 1) {
          :root {
            --aspect-ratio-supported: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ViatorAspectContainer;
