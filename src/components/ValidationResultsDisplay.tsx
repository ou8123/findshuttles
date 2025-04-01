"use client";

import React from 'react';

interface ValidationResultsDisplayProps {
  issues: string[];
}

/**
 * Component to display content validation results
 * Shows a success message when no issues found,
 * or a list of issues that need to be addressed
 */
const ValidationResultsDisplay: React.FC<ValidationResultsDisplayProps> = ({ issues }) => {
  if (!issues || issues.length === 0) {
    return (
      <div className="p-2 bg-green-50 text-green-700 border border-green-200 rounded-md mb-2">
        <p className="flex items-center">
          <span className="mr-2">✅</span>
          Content passed validation checks
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md mb-2">
      <p className="font-semibold mb-1">Content Issues:</p>
      <ul className="list-disc pl-5 space-y-1">
        {issues.map((issue, index) => (
          <li key={index}>{issue}</li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationResultsDisplay;
