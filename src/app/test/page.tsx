'use client';

import { useEffect } from 'react';

export default function TestPage() {
  useEffect(() => {
    // Load Viator script
    const script = document.createElement('script');
    script.src = 'https://www.viator.com/orion/js/widgets/viator-widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Test Widget</h1>
      <div 
        className="viator-widget" 
        data-widget-type="products"
        data-destination-id="80003"
        data-top-x="5"
        data-language="en"
        data-currency="USD"
      />
    </div>
  );
}