"use client";

import { useState, useEffect, useRef } from 'react';

interface ViatorSimpleWidgetProps {
  widgetCode: string;
  className?: string;
  minHeight?: number;
}

/**
 * ViatorSimpleWidget
 * 
 * A simplified widget component that works reliably in all environments.
 * Used as a fallback when more advanced implementations have issues.
 */
const ViatorSimpleWidget: React.FC<ViatorSimpleWidgetProps> = ({
  widgetCode,
  className = '',
  minHeight = 240, // Smaller default height as requested
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Handle widget initialization on the client side only
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    
    try {
      // Insert the widget code directly
      containerRef.current.innerHTML = widgetCode;
      
      // Load the Viator script
      const script = document.createElement('script');
      script.src = 'https://www.viator.com/orion/partner/widget.js';
      script.async = true;
      
      script.onload = () => {
        setIsLoading(false);
        // Give the widget some time to render its content
        setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
      };
      
      script.onerror = () => {
        setHasError(true);
        setIsLoading(false);
      };
      
      // Append the script to the document
      document.body.appendChild(script);
      
      return () => {
        // Clean up
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    } catch (error) {
      console.error('Error initializing Viator widget:', error);
      setHasError(true);
      setIsLoading(false);
    }
  }, [widgetCode]);
  
  return (
    <div className={`viator-simple-widget ${className}`}>
      {/* Widget container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: `${minHeight}px`,
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '8px',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          position: 'relative',
        }}
      />
      
      {/* Loading indicator */}
      {isLoading && (
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
            background: 'rgba(255,255,255,0.8)',
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
            background: 'rgba(255,255,255,0.8)',
            zIndex: 5,
          }}
        >
          <div style={{
            padding: '16px',
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            borderRadius: '4px',
            maxWidth: '80%',
            textAlign: 'center',
          }}>
            <p style={{ color: '#cf1322' }}>
              There was an issue loading the booking widget.
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (containerRef.current) {
                  containerRef.current.innerHTML = '';
                  containerRef.current.innerHTML = widgetCode;
                }
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
      
      <style jsx>{`
        @keyframes viatorSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ViatorSimpleWidget;
