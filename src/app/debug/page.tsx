'use client';

import { useEffect, useState } from 'react';
import ErrorLogger from '@/components/ErrorLogger';
import ViatorWidgetRenderer from '@/components/ViatorWidgetRenderer';
import RouteMap from '@/components/RouteMap';
import Link from 'next/link';

// Define types for our route data
interface City {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface Country {
  name: string;
}

interface Route {
  routeSlug: string;
  displayName: string;
  viatorWidgetCode: string;
  seoDescription: string | null;
  departureCity: City;
  departureCountry: Country;
  destinationCity: City;
  destinationCountry: Country;
}

export default function DebugPage() {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState({ online: navigator.onLine });
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    width: 0,
    height: 0,
    pixelRatio: 1,
    touchEnabled: false,
  });

  // Global error handling function
  const globalErrorHandler = (message: string, details?: any) => {
    console.error(`Debug Page Error: ${message}`, details);
    setError(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
  };

  // Intentional error trigger function (for testing)
  const triggerIntentionalError = () => {
    try {
      // INTENTIONAL ERROR - The TypeScript error here is expected and desired!
      // @ts-ignore -- We're intentionally causing a ReferenceError at runtime
      // eslint-disable-next-line
      const nonExistentVar = undefinedVariable; // This variable doesn't exist!
    } catch (err) {
      console.error('Intentional error triggered for testing', err);
    }
  };

  // Fetch route data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch the route we know exists from the seed data
        const response = await fetch(`/api/routes/montezuma-del-sol-to-puerto-luna`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setRoute(data);
      } catch (err) {
        let errorMessage = 'Failed to fetch route data';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        globalErrorHandler(errorMessage, err);
      } finally {
        setLoading(false);
      }
    };
    
    // Get device info
    setDeviceInfo({
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      touchEnabled: 'ontouchstart' in window,
    });
    
    // Online/offline status detection
    const handleOnline = () => setNetworkInfo({ online: true });
    const handleOffline = () => setNetworkInfo({ online: false });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    fetchData();
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor our route content height and log any changes
  const logContentHeight = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      console.log(`Content height for ${elementId}: ${element.offsetHeight}px`);
      return element.offsetHeight;
    }
    return 0;
  };

  // Add global error handler when window.onerror is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.onerror = (message, source, lineno, colno, error) => {
        console.log('Global error caught:', { message, source, lineno, colno });
        return false; // Allow normal error handling to continue
      };
    }
  }, []);

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto">
      {/* Error Logger */}
      <div className="mb-6 sticky top-0 z-20">
        <ErrorLogger maxErrors={20} showControls={true} />
      </div>
      
      <h1 className="text-3xl font-bold mb-4">Debug Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Network & Device Info</h2>
          <div className="text-sm">
            <div className="mb-2">
              <span className="font-medium">Network Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${networkInfo.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {networkInfo.online ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="mb-1"><span className="font-medium">User Agent:</span> <span className="text-gray-600">{deviceInfo.userAgent}</span></div>
            <div className="mb-1"><span className="font-medium">Screen Size:</span> <span className="text-gray-600">{deviceInfo.width} x {deviceInfo.height}</span></div>
            <div className="mb-1"><span className="font-medium">Pixel Ratio:</span> <span className="text-gray-600">{deviceInfo.pixelRatio}</span></div>
            <div><span className="font-medium">Touch Enabled:</span> <span className="text-gray-600">{deviceInfo.touchEnabled ? 'Yes' : 'No'}</span></div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Debug Tools</h2>
          <div className="space-y-2">
            <button
              onClick={triggerIntentionalError}
              className="w-full py-2 px-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded border border-yellow-300"
            >
              Trigger JavaScript Error
            </button>
            
            <button
              onClick={() => new Promise((_, reject) => setTimeout(() => reject(new Error('Test promise rejection')), 100))}
              className="w-full py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300"
            >
              Trigger Promise Rejection
            </button>
            
            <button
              onClick={() => logContentHeight('route-content')}
              className="w-full py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300"
            >
              Log Content Heights
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-green-100 hover:bg-green-200 text-green-800 rounded border border-green-300"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
      
      <div id="route-content" className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="mb-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to Home
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : route ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {route.displayName || `Shuttles from ${route.departureCity.name} to ${route.destinationCity.name}`}
            </h2>
            
            {/* Route Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="text-lg font-semibold mb-2">Departure</h3>
                <p className="font-medium">{route.departureCity.name}</p>
                <p className="text-gray-600">{route.departureCountry.name}</p>
                <p className="text-sm text-gray-500">
                  {route.departureCity.latitude && route.departureCity.longitude && 
                   `Coordinates: ${route.departureCity.latitude}, ${route.departureCity.longitude}`}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="text-lg font-semibold mb-2">Destination</h3>
                <p className="font-medium">{route.destinationCity.name}</p>
                <p className="text-gray-600">{route.destinationCountry.name}</p>
                <p className="text-sm text-gray-500">
                  {route.destinationCity.latitude && route.destinationCity.longitude && 
                   `Coordinates: ${route.destinationCity.latitude}, ${route.destinationCity.longitude}`}
                </p>
              </div>
            </div>
            
            {/* Description */}
            {route.seoDescription && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Route Description</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p>{route.seoDescription}</p>
                </div>
              </div>
            )}
            
            {/* Booking Widget */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Book Your Shuttle</h3>
              <div 
                className="viator-widget-container rounded border border-gray-200 bg-white"
                style={{ minHeight: '400px', position: 'relative' }}
              >
                {route.viatorWidgetCode ? (
                  <ViatorWidgetRenderer 
                    key={`viator-${route.routeSlug}`} 
                    widgetCode={route.viatorWidgetCode}
                    routeSlug={route.routeSlug}
                  />
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No booking widget available for this route.
                  </div>
                )}
              </div>
            </div>
            
            {/* Route Map */}
            {route.departureCity?.latitude && 
             route.departureCity?.longitude && 
             route.destinationCity?.latitude && 
             route.destinationCity?.longitude && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Route Map</h3>
                <div className="rounded overflow-hidden" style={{ height: '400px' }}>
                  <RouteMap
                    departureLat={route.departureCity.latitude}
                    departureLng={route.departureCity.longitude}
                    destinationLat={route.destinationCity.latitude}
                    destinationLng={route.destinationCity.longitude}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No route data found
          </div>
        )}
      </div>
    </div>
  );
}
