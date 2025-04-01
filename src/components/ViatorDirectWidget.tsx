"use client";

import { useState, useEffect, useRef } from 'react';

interface ViatorDirectWidgetProps {
  widgetCode: string;
  className?: string;
  // Default aspect ratio as a percentage (padding-bottom)
  paddingPercentage?: number;
  // Mobile specific padding percentage
  mobilePaddingPercentage?: number;
}

/**
 * ViatorDirectWidget
 * 
 * A component that directly embeds Viator widgets with proper script inclusion
 * and initialization, using the padding-bottom technique for maintaining aspect ratio.
 */
const ViatorDirectWidget: React.FC<ViatorDirectWidgetProps> = ({
  widgetCode,
  className = '',
  // Default to 16:9 aspect ratio (9/16 = 56.25%)
  paddingPercentage = 56.25,
  // For mobile, use a taller ratio - 3:4 aspect ratio (4/3 = 75%)
  mobilePaddingPercentage = 75,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Track if the widget has been initialized
  const widgetInitialized = useRef(false);

  // Extract widget ID from the widget code
  const getWidgetId = (code: string) => {
    const match = code.match(/data-vi-widget-ref=["']([^"']+)["']/);
    return match ? match[1] : null;
  };

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    // Check on mount
    checkMobile();
    
    // Check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize the widget
  useEffect(() => {
    if (!containerRef.current || !widgetCode || widgetInitialized.current) return;

    // Reset loading state
    setIsLoaded(false);
    setHasError(false);
    
    // Function to initialize the widget
    const initializeWidget = () => {
      try {
        // Clear previous content and set new widget HTML
        containerRef.current!.innerHTML = widgetCode;
        
        console.log('Loading Viator script...');
        
        // Create a new script element for Viator
        const script = document.createElement('script');
        script.src = 'https://www.viator.com/orion/partner/widget.js';
        script.async = true;
        
        // Handle script load
        script.onload = () => {
          console.log('Viator script loaded successfully');
          setIsLoaded(true);
          
          // Dispatch resize after a short delay to ensure everything renders correctly
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 500);
        };
        
        // Handle script error
        script.onerror = (err) => {
          console.error('Failed to load Viator script:', err);
          setHasError(true);
        };
        
        // Append the script to the container instead of body
        // This ensures it's loaded in the right context and order
        containerRef.current!.appendChild(script);
        
        // Mark as initialized to prevent duplicate initialization
        widgetInitialized.current = true;
      } catch (error) {
        console.error('Error initializing widget:', error);
        setHasError(true);
      }
    };

    // Initialize on mount
    initializeWidget();
  }, [widgetCode]);

  // Choose the appropriate padding based on device
  const effectivePadding = isMobile ? mobilePaddingPercentage : paddingPercentage;

  return (
    <div className={`viator-widget-wrapper ${className}`}>
      {/* Outer container with aspect ratio */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: 0,
          paddingBottom: `${effectivePadding}%`,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '8px',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        {/* Inner container for iframe */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
        
        {/* Loading indicator */}
        {!isLoaded && !hasError && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.9)',
              zIndex: 5,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'viatorSpin 1s linear infinite',
                }}
              />
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#555' }}>
                Loading travel options...
              </p>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {hasError && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.9)',
              zIndex: 5,
            }}
          >
            <div style={{ 
              textAlign: 'center',
              maxWidth: '80%',
              padding: '16px',
              background: '#fff1f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
            }}>
              <p style={{ color: '#cf1322' }}>
                There was an issue loading the booking widget.
              </p>
              <button
                onClick={() => {
                  widgetInitialized.current = false;
                  setHasError(false);
                  setIsLoaded(false);
                  
                  // Re-initialize after a short delay
                  setTimeout(() => {
                    if (containerRef.current) {
                      containerRef.current.innerHTML = '';
                      widgetInitialized.current = false;
                      
                      // Force re-initialization
                      const initScript = document.createElement('script');
                      initScript.src = 'https://www.viator.com/orion/partner/widget.js';
                      initScript.async = true;
                      
                      containerRef.current.innerHTML = widgetCode;
                      containerRef.current.appendChild(initScript);
                    }
                  }, 100);
                }}
                style={{
                  marginTop: '8px',
                  padding: '6px 16px',
                  background: '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes viatorSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ViatorDirectWidget;
