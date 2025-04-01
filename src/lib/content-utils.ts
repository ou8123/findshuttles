/**
 * Utility functions for processing and validating content for the OpenAI integration
 */

/**
 * Cleans and formats editor notes before sending to OpenAI
 * - Removes external URLs and promotional language
 * - Converts first-person to third-person where possible
 * - Extracts and formats city/hotel lists
 * 
 * @param rawInput The raw editor notes from the textarea
 * @returns Cleaned and formatted content
 */
export function cleanEditorNotes(rawInput: string): string {
  if (!rawInput || rawInput.trim() === '') return '';
  
  // Normalize line endings
  let cleaned = rawInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove external URLs and "read more" phrases
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  cleaned = cleaned.replace(/read more about.*$/gim, '');
  cleaned = cleaned.replace(/visit (the )?official page.*$/gim, '');
  cleaned = cleaned.replace(/\bviator\.com\b/gi, 'BookShuttles.com');
  
  // Remove affiliate/partner language
  cleaned = cleaned.replace(/affiliate (link|service|partner)/gi, 'service');
  cleaned = cleaned.replace(/Viator affiliate/gi, 'shuttle service');
  
  // Convert common first-person phrases to neutral third-person
  const firstPersonReplacements = [
    { pattern: /\b(?:we|our)\s+(?:offer|provide|have)\b/gi, replacement: 'the service offers' },
    { pattern: /\b(?:you|your)\s+(?:can|will)\s+(?:enjoy|experience|receive)\b/gi, replacement: 'travelers can enjoy' },
    { pattern: /\b(?:we|our)\s+(?:staff|team|drivers)\b/gi, replacement: 'the staff' },
    { pattern: /\b(?:you|your)\s+(?:journey|trip|travel)\b/gi, replacement: 'the journey' },
    { pattern: /\b(?:we|our)\s+vehicles\b/gi, replacement: 'the vehicles' },
    { pattern: /\byou(?:'ll| will)\b/gi, replacement: 'travelers will' },
    { pattern: /\byour\b/gi, replacement: 'the' },
    { pattern: /\bwe\b/gi, replacement: 'the service' },
    { pattern: /\bour\b/gi, replacement: 'the' },
    { pattern: /\byou\b/gi, replacement: 'travelers' }
  ];
  
  // Apply all first-person replacements
  for (const { pattern, replacement } of firstPersonReplacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // Remove promotional superlatives
  const promotionalPhrases = [
    /\b(?:best|top|premier|luxury|exclusive|exceptional|outstanding|unparalleled)\b/gi,
    /\b(?:amazing|incredible|extraordinary|spectacular|remarkable)\b/gi
  ];
  
  for (const pattern of promotionalPhrases) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Extract cities - try different patterns
  let extractedCities: string[] = [];
  
  // Common city list patterns
  const cityRegexes: RegExp[] = [
    // Between city1 and city2
    /(?:between|connecting)\s+([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i,
    // Cities include: city1, city2, and city3
    /cities\s*(?:include|:)\s*([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i,
    // Provides service to city1, city2, and city3
    /(?:provides service to|serves)\s+([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i
  ];
  
  // Try to extract cities using different patterns
  for (const regex of cityRegexes) {
    const match = cleaned.match(regex);
    if (match && match[1]) {
      // Split the matched text into city names
      const cities = match[1]
        .replace(/\s+and\s+|\s*&\s*/g, ', ') // Replace "and" and "&" with commas
        .split(/\s*,\s*/)                    // Split by commas
        .map(city => city.trim())            // Trim whitespace
        .filter(city => city.length > 1);    // Filter out any empty or single-character entries
      
      if (cities.length >= 2) {
        extractedCities = cities;
        break;
      }
    }
  }
  
  // Extract hotels - look for common patterns
  const hotelMatches = cleaned.match(/(?:hotels?|accommodations?|lodging)(?:\s+include|\s*:)?\s+([\w\s,'&]+(?:Inn|Hotel|Lodge|Motel|Suites|Resort|Plaza|&|and)[\w\s,'&]+)/gi);
  const extractedHotels: string[] = [];
  
  if (hotelMatches && hotelMatches.length > 0) {
    const hotelText = hotelMatches.join(' ');
    
    // Extract hotel names - look for patterns like capitalized words followed by Hotel, Inn, etc.
    const hotelNameRegex = /([A-Z][\w\s,'&]+(?:Inn|Hotel|Lodge|Motel|Suites|Resort|Plaza))/g;
    let hotelMatch: RegExpExecArray | null;
    while ((hotelMatch = hotelNameRegex.exec(hotelText)) !== null) {
      if (hotelMatch[1] && hotelMatch[1].trim().length > 5) { // Ensure it's a substantial hotel name
        extractedHotels.push(hotelMatch[1].trim());
      }
    }
  }
  
  // Add structured city list if we found cities
  if (extractedCities.length >= 2) {
    cleaned += '\n\nCities Served:\n' + extractedCities.map(city => `- ${city}`).join('\n');
  }
  
  // Add structured hotel list if we found hotels
  if (extractedHotels.length >= 1) {
    cleaned += '\n\nHotels Served:\n' + extractedHotels.map(hotel => `- ${hotel}`).join('\n');
  }
  
  return cleaned.trim();
}

/**
 * Validates generated content for common SEO and formatting issues
 * 
 * @param output The generated content from OpenAI
 * @returns Array of issue messages, empty if no issues found
 */
export function validateGeneratedContent(output: string): string[] {
  const issues: string[] = [];

  // Check for paragraph breaks
  if (!output.includes('\n\n')) {
    issues.push('⚠️ Content is only one paragraph. Add paragraph breaks for better readability.');
  }

  // Check for external URLs
  if (/https?:\/\//.test(output)) {
    issues.push('⚠️ External URL detected — must be removed.');
  }

  // Check for operator names
  if (/\b(Viator|Cantrip Shuttle|GetYourGuide)\b/i.test(output)) {
    issues.push('⚠️ Shuttle operator name found — should not be included.');
  }

  // Check for first-person language
  if (/\b(we|our|you|your)\b/i.test(output)) {
    issues.push('⚠️ First-person phrasing found — rewrite to neutral third-person.');
  }

  // Check for sentence count
  const sentenceCount = output.split(/[.!?]\s+/).length;
  if (sentenceCount < 6) {
    issues.push('⚠️ Content is too short (<6 sentences). Add more information for better SEO.');
  } else if (sentenceCount > 12) {
    issues.push('⚠️ Content is very long (>12 sentences). Consider trimming for better readability.');
  }

  // Check for city/hotel lists if they appear to be mentioned
  if ((output.toLowerCase().includes('city') || output.toLowerCase().includes('cities')) && 
      !output.includes('Cities Served:')) {
    issues.push('⚠️ Missing "Cities Served:" section. Format city lists properly.');
  }

  if ((output.toLowerCase().includes('hotel') || output.toLowerCase().includes('accommodation')) && 
      !output.includes('Hotels Served:')) {
    issues.push('⚠️ Missing "Hotels Served:" section. Format hotel lists properly.');
  }

  return issues;
}

// We'll create UI components for rendering validation results in their respective component files
