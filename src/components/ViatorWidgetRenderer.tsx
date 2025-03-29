"use client";

interface ViatorWidgetRendererProps {
  widgetCode: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ widgetCode }) => {
  // Extract widget ID and partner ID from the widget code
  const getWidgetAttributes = (code: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;
    const widget = tempDiv.querySelector('div');
    return {
      partnerId: widget?.getAttribute('data-vi-partner-id') || 'P00097086',
      widgetRef: widget?.getAttribute('data-vi-widget-ref') || `W-${Math.random().toString(36).substr(2, 9)}`
    };
  };

  return (
    <div>
      <div 
        className="w-full min-h-[400px]"
        style={{ 
          height: 'auto',
          overflow: 'visible'
        }}
      >
        <div 
          data-vi-partner-id={getWidgetAttributes(widgetCode).partnerId}
          data-vi-widget-ref={getWidgetAttributes(widgetCode).widgetRef}
        />
      </div>
      <div className="text-center mt-4">
        <button
          onClick={() => window.location.reload()}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          Shuttle Options not loading? Click here to refresh
        </button>
      </div>
    </div>
  );
};

export default ViatorWidgetRenderer;