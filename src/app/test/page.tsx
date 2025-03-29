'use client';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Test Widget</h1>
      <div 
        className="w-full min-h-[400px]"
        style={{ 
          height: 'auto',
          overflow: 'visible'
        }}
      >
        <div 
          data-vi-partner-id="P00097086" 
          data-vi-widget-ref="W-21cdadda-41e2-4370-bc9b-2b8d51d32d65"
        />
      </div>
      <div className="text-center mt-4">
        <button
          onClick={() => window.location.reload()}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          Not loading? Click here to refresh
        </button>
      </div>
    </div>
  );
}