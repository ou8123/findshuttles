"use client";

import { useState, useEffect, useRef } from 'react';
import ViatorAspectContainer from './ViatorAspectContainer';

interface ViatorAspectWidgetProps {
  widgetCode: string; 
  className?: string;
  // Use a wider aspect ratio of 3:2 for better fit with most Viator widgets
  aspectRatio?: number;
  // Different aspect ratios for mobile vs desktop
  mobileAspectRatio?: number;
}

/**
 * ViatorAspectWidget
 * 
 * A specialized component that combines the ViatorAspectContainer with
 * the proper rendering of Viator widgets. This component:
 * 
 * - Uses aspect ratio for consistent sizing
 * - Safely injects Viator widget code
 * - Handles script loading and initialization
 * - Optimizes for both mobile and desktop with different aspect ratios
 * - Automatically adapts to the content's natural dimensions
 */
const ViatorAspectWidget: React.FC<ViatorAspectWidgetProps> = ({
  widgetCode,
  className = '',
  aspectRatio = 3/2, // Better fit for most Viator widgets on desktop
  mobileAspectRatio = 2/3, // Taller, narrower container for mobile
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [key, setKey] = useState(`viator-${Date.now()}`); // Force remount when needed
  
  // Detect mobile and apply appropriate aspect ratio
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
  
  // Used to track script loading
  const scriptLoaded = useRef(false);
  
  // Initialize widget when component mounts
  useEffect(() => {
    if (!containerRef.current || !widgetCode) return;
    
    // Reset state
    setIsLoaded(false);
    setHasError(false);
    
    // Load the Viator widget
    const initWidget = async () => {
      try {
        // Clear any previous content
        containerRef.current!.innerHTML = '';
        
        // Insert the widget HTML
        containerRef.current!.innerHTML = widgetCode;
        
        // Load the Viator script if not already loaded
        if (!scriptLoaded.current && !window.hasOwnProperty('viatorMakeWidget')) {
          await loadViatorScript();
        }
        
        // Set loaded state
        setIsLoaded(true);
        
        // Handle resize event to ensure Viator widgets render properly
        window.dispatchEvent(new Event('resize'));
      } catch (error) {
        console.error('Error initializing Viator widget:', error);
        setHasError(true);
      }
    };
    
    initWidget();
    
    // Clean up function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetCode, key]);
  
  // Helper function to load Viator script
  const loadViatorScript = () => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Check if script already exists
        if (document.querySelector('script[src*="viator.com/orion/partner/widget.js"]')) {
          scriptLoaded.current = true;
          return resolve();
        }
        
        const script = document.createElement('script');
        script.src = 'https://www.viator.com/orion/partner/widget.js';
        script.async = true;
        
        // Handle script load success
        script.onload = () => {
          console.log('Viator widget script loaded successfully');
          scriptLoaded.current = true;
          resolve();
        };
        
        // Handle script load failure
        script.onerror = (err) => {
          console.error('Failed to load Viator widget script:', err);
          reject(err);
        };
        
        // Add script to document body
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error creating script element:', error);
        reject(error);
      }
    });
  };
  
  // Choose the appropriate aspect ratio based on device
  const effectiveAspectRatio = isMobile ? mobileAspectRatio : aspectRatio;
  
  // Reduced max height for mobile
  const maxHeight = isMobile ? 650 : 800;
  
  return (
    <ViatorAspectContainer 
      className={className}
      aspectRatio={effectiveAspectRatio}
      maxHeight={maxHeight}
    >
      <div 
        ref={containerRef}
        className="viator-widget-content"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      />
      
      {/* Show loading state while initializing */}
      {!isLoaded && !hasError && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 1,
          }}
        >
          <div className="text-center p-4">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-indigo-600 motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-gray-600">Loading travel options...</p>
          </div>
        </div>
      )}
      
      {/* Show error message if loading failed */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: '#fff',
            zIndex: 2,
          }}
        >
          <div className="text-center p-4 bg-red-50 rounded shadow-sm w-full max-w-md">
            <p className="text-red-600">There was an issue loading the booking widget.</p>
            <button
              onClick={() => setKey(`viator-${Date.now()}`)} // Force remount/reload
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </ViatorAspectContainer>
  );
};

export default ViatorAspectWidget;
