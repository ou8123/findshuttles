// @ts-nocheck
"use client";

import React from 'react';

/**
 * FormattedDescription Component
 * 
 * This component transforms plain text descriptions into formatted HTML:
 * - Converts paragraphs (separated by double newlines) into proper <p> tags
 * - Detects "Cities Served:" and "Hotels Served:" sections and converts them to HTML lists
 * - Preserves formatting while ensuring proper display
 * 
 * @param {Object} props Component props
 * @param {string} props.text The plain text to format
 * @param {string} props.className Additional CSS classes to apply
 * @returns {JSX.Element} Formatted HTML content
 */
const FormattedDescription = ({ text, className = '' }) => {
  // If no text provided, return empty div
  if (!text) {
    return <div className={className}></div>;
  }

  // Function to parse and format the text
  const formatContent = (content) => {
    // Normalize newlines and ensure consistency
    const normalizedText = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Initial split into sections, preserving empty lines that might be paragraph breaks
    const sections = normalizedText.split(/\n\n+/);
    
    // Process each section and track when we're in list mode
    let inCitiesList = false;
    let inHotelsList = false;
    let currentListItems = [];
    
    // Result array that will hold all the processed JSX elements
    const result = [];
    let sectionIndex = 0;
    
    // Check if the first section is a time estimate
    if (sections.length > 0 && sections[0].trim().startsWith('🕒')) {
      // Make the time estimate bold
      result.push(
        <p key="time-estimate" className="font-bold mb-4">
          {sections[0]}
        </p>
      );
      // Remove the time estimate from sections to process
      sections.shift();
    }
    
    for (const section of sections) {
      // Skip empty sections
      if (section.trim() === '') {
        continue;
      }
      
      // Handle section transition back to regular text
      if ((inCitiesList || inHotelsList) && !section.trim().startsWith('-')) {
        // End the current list
        if (inCitiesList) {
          result.push(
            <div key={`cities-list-${sectionIndex}`} className="my-4">
              <h3 className="font-bold mb-2">Cities Served:</h3>
              <ul className="list-disc pl-8 space-y-1">
                {currentListItems.map((item, i) => (
                  <li key={`city-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          );
          inCitiesList = false;
        } else if (inHotelsList) {
          result.push(
            <div key={`hotels-list-${sectionIndex}`} className="my-4">
              <h3 className="font-bold mb-2">Hotels Served:</h3>
              <ul className="list-disc pl-8 space-y-1">
                {currentListItems.map((item, i) => (
                  <li key={`hotel-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          );
          inHotelsList = false;
        }
        currentListItems = [];
      }
      
      // Check for list headers first
      if (section.trim().startsWith('Cities Served:')) {
        // Start collecting city list items
        inCitiesList = true;
        inHotelsList = false;
        currentListItems = [];
        
        // Extract any items that might be on the same line
        const remainingText = section.replace('Cities Served:', '').trim();
        if (remainingText) {
          // If there's content on the same line, check for list items
          const lines = remainingText.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('-')) {
              currentListItems.push(line.trim().substring(1).trim());
            }
          }
        }
      } else if (section.trim().startsWith('Hotels Served:')) {
        // Start collecting hotel list items
        inHotelsList = true;
        inCitiesList = false;
        currentListItems = [];
        
        // Extract any items that might be on the same line
        const remainingText = section.replace('Hotels Served:', '').trim();
        if (remainingText) {
          // If there's content on the same line, check for list items
          const lines = remainingText.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('-')) {
              currentListItems.push(line.trim().substring(1).trim());
            }
          }
        }
      } else if (inCitiesList || inHotelsList) {
        // We're inside a list, add items
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('-')) {
            currentListItems.push(line.trim().substring(1).trim());
          }
        }
      } else {
        // Regular paragraph text
        result.push(
          <p key={`para-${sectionIndex}`} className="mb-4">
            {section.split('\n').map((line, i, arr) => (
              <React.Fragment key={`line-${sectionIndex}-${i}`}>
                {line}
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      }
      
      sectionIndex++;
    }
    
    // Add any remaining list at the end
    if (inCitiesList && currentListItems.length > 0) {
      result.push(
        <div key={`cities-list-final`} className="my-4">
          <h3 className="font-bold mb-2">Cities Served:</h3>
          <ul className="list-disc pl-8 space-y-1">
            {currentListItems.map((item, i) => (
              <li key={`city-${i}`}>{item}</li>
            ))}
          </ul>
        </div>
      );
    } else if (inHotelsList && currentListItems.length > 0) {
      result.push(
        <div key={`hotels-list-final`} className="my-4">
          <h3 className="font-bold mb-2">Hotels Served:</h3>
          <ul className="list-disc pl-8 space-y-1">
            {currentListItems.map((item, i) => (
              <li key={`hotel-${i}`}>{item}</li>
            ))}
          </ul>
        </div>
      );
    }
    
    return result;
  };

  return (
    <div className={`${className} whitespace-pre-line`}>
      {formatContent(text)}
    </div>
  );
};

export default FormattedDescription;
