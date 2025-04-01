"use client";

import React, { useState } from 'react';
import { cleanEditorNotes, validateGeneratedContent } from '@/lib/content-utils';
import ValidationResultsDisplay from './ValidationResultsDisplay';

interface ContentEditorControlsProps {
  additionalInstructions: string;
  setAdditionalInstructions: (value: string) => void;
  seoDescription: string;
  setSeoDescription: (value: string) => void;
  isGenerating: boolean;
}

/**
 * UI controls for content editing, cleaning, and validation
 * Can be used in both create and edit route forms
 */
const ContentEditorControls: React.FC<ContentEditorControlsProps> = ({
  additionalInstructions,
  setAdditionalInstructions,
  seoDescription,
  setSeoDescription,
  isGenerating
}) => {
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [cleanedPreview, setCleanedPreview] = useState<string | null>(null);
  const [showCleanedPreview, setShowCleanedPreview] = useState(false);

  // Handler for cleaning the editor notes
  const handleClean = () => {
    if (!additionalInstructions.trim()) {
      return;
    }
    
    const cleaned = cleanEditorNotes(additionalInstructions);
    setCleanedPreview(cleaned);
    setShowCleanedPreview(true);
  };

  // Handler for applying the cleaned notes
  const applyCleanedNotes = () => {
    if (cleanedPreview) {
      setAdditionalInstructions(cleanedPreview);
      setShowCleanedPreview(false);
      setCleanedPreview(null);
    }
  };

  // Handler for validating the SEO description
  const validateContent = () => {
    if (!seoDescription.trim()) {
      return;
    }
    
    const issues = validateGeneratedContent(seoDescription);
    setValidationIssues(issues);
    setShowValidation(true);
  };

  return (
    <div className="space-y-4 border-l-4 border-blue-500 pl-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-blue-600">Content Tools</h3>
      </div>
      
      {/* Clean Notes button and preview */}
      <div>
        <button
          type="button"
          onClick={handleClean}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          disabled={!additionalInstructions.trim()}
        >
          🧼 Clean Editor Notes
        </button>
        
        {showCleanedPreview && cleanedPreview && (
          <div className="mt-2">
            <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto bg-gray-50 mb-2">
              <pre className="text-xs whitespace-pre-wrap">{cleanedPreview}</pre>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={applyCleanedNotes}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
              >
                Apply Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCleanedPreview(false);
                  setCleanedPreview(null);
                }}
                className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Validate Content button and results */}
      <div>
        <button
          type="button"
          onClick={validateContent}
          className="px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
          disabled={!seoDescription.trim() || isGenerating}
        >
          🚩 Check for SEO/Formatting Issues
        </button>
        
        {showValidation && (
          <div className="mt-2">
            <ValidationResultsDisplay issues={validationIssues} />
            <button
              type="button"
              onClick={() => setShowValidation(false)}
              className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
            >
              Hide
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentEditorControls;
