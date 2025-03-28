"use client"; // Ensure this component only renders client-side

import React from 'react';

interface ViatorWidgetRendererProps {
  htmlContent: string;
}

const ViatorWidgetRenderer: React.FC<ViatorWidgetRendererProps> = ({ htmlContent }) => {
  // Directly render the potentially problematic HTML inside a client component
  // This avoids the server/client mismatch for this specific part.
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default ViatorWidgetRenderer;