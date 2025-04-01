// @ts-nocheck
"use client";

import React from 'react';

/**
 * FormattedDescription Component - Completely Revised for Netlify Compatibility
 * 
 * This component transforms plain text descriptions into formatted HTML:
 * - Uses dangerouslySetInnerHTML for consistent cross-platform rendering
 * - Handles paragraphs, time estimates, and lists properly
 * - Ensures proper display in both local and production environments
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

  // Process text to HTML once - more reliable than JSX transformation
  const processedHtml = React.useMemo(() => {
    // Normalize line endings
    let processedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Extract time estimate if present at the beginning
    let timeEstimateHtml = '';
    const timeEstimateMatch = processedText.match(/^(🕒.*?)(?:\n\n|\n|$)/);
    
    if (timeEstimateMatch) {
      const timeEstimate = timeEstimateMatch[1].trim();
      timeEstimateHtml = `<p class="font-bold mb-4">${timeEstimate}</p>`;
      
      // Remove the time estimate from the text
      processedText = processedText.replace(timeEstimateMatch[0], '').trim();
    }
    
    // Split into main parts - text content and any lists at the end
    let mainContent = '';
    let citiesListHtml = '';
    let hotelsListHtml = '';
    
    // Check for cities/hotels lists at the end
    const citiesMatch = processedText.match(/Cities Served:[\s\S]*?(?=\n\n|\n?Hotels Served:|\n?$)/);
    const hotelsMatch = processedText.match(/Hotels Served:[\s\S]*?$/);
    
    // If lists exist, extract them and remove from main content
    if (citiesMatch) {
      const citiesList = citiesMatch[0];
      processedText = processedText.replace(citiesList, '').trim();
      
      // Process city list items
      const cityItems = citiesList.replace('Cities Served:', '')
        .trim()
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
        .filter(item => item);
      
      if (cityItems.length > 0) {
        citiesListHtml = `
          <div class="my-4">
            <h3 class="font-bold mb-2">Cities Served:</h3>
            <ul class="list-disc pl-8 space-y-1">
              ${cityItems.map(city => `<li>${city}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }
    
    if (hotelsMatch) {
      const hotelsList = hotelsMatch[0];
      processedText = processedText.replace(hotelsList, '').trim();
      
      // Process hotel list items
      const hotelItems = hotelsList.replace('Hotels Served:', '')
        .trim()
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
        .filter(item => item);
      
      if (hotelItems.length > 0) {
        hotelsListHtml = `
          <div class="my-4">
            <h3 class="font-bold mb-2">Hotels Served:</h3>
            <ul class="list-disc pl-8 space-y-1">
              ${hotelItems.map(hotel => `<li>${hotel}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }
    
    // Process main content paragraphs with explicit <p> tags
    mainContent = processedText
      .split(/\n\n+/)
      .filter(para => para.trim())
      .map(para => {
        // Convert single newlines within paragraphs to <br> tags
        const formattedPara = para.split('\n')
          .map(line => line.trim())
          .join('<br>');
        
        return `<p class="mb-4">${formattedPara}</p>`;
      })
      .join('');
    
    // Combine all parts
    return `
      ${timeEstimateHtml}
      ${mainContent}
      ${citiesListHtml}
      ${hotelsListHtml}
    `;
  }, [text]);

  // Use dangerouslySetInnerHTML for consistent rendering across platforms
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

export default FormattedDescription;
