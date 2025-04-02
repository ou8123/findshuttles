import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Preprocess additional instructions to clean URLs, format city/hotel lists, and neutralize tone
 * 
 * @param input The raw additional instructions from the editor
 * @returns Cleaned and structured content ready for LLM processing
 */
function preprocessAdditionalInstructions(input: string): string {
  if (!input || input.trim() === '') return '';
  
  // Normalize line endings
  let processed = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove external URLs
  processed = processed.replace(/https?:\/\/\S+/g, '');
  processed = processed.replace(/Read more about.*$/gim, '');
  processed = processed.replace(/visit (the )?official page.*$/gim, '');
  
  // Try to extract city lists
  const cityRegexes: RegExp[] = [
    /(?:between|connecting)\s+([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i,
    /cities\s*(?:include|:)\s*([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i,
    /(?:provides service to|serves)\s+([\w\s,]+(?:and|&)[\w\s]+)(?:\.|,)/i
  ];
  
  let extractedCities: string[] = [];
  
  // Try to extract cities using different patterns
  for (const regex of cityRegexes) {
    const match = processed.match(regex);
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
  
  // Try to extract hotel mentions
  const hotelMatches = processed.match(/(?:hotels?|accommodations?|lodging)(?:\s+include|\s*:)?\s+([\w\s,'&]+(?:Inn|Hotel|Lodge|Motel|Suites|Resort|Plaza|&|and)[\w\s,'&]+)/gi);
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
  
  // Neutralize first-person language
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
    processed = processed.replace(pattern, replacement);
  }
  
  // Remove promotional superlatives
  const promotionalPhrases = [
    /\b(?:best|top|premier|luxury|exclusive|exceptional|outstanding|unparalleled)\b/gi,
    /\b(?:amazing|incredible|extraordinary|spectacular|remarkable)\b/gi
  ];
  
  for (const pattern of promotionalPhrases) {
    processed = processed.replace(pattern, '');
  }
  
  // Add structured city list if we found cities
  if (extractedCities.length >= 2) {
    processed += '\n\nCities Served:\n' + extractedCities.map(city => `- ${city}`).join('\n');
  }
  
  // Add structured hotel list if we found hotels
  if (extractedHotels.length >= 1) {
    processed += '\n\nHotels Served:\n' + extractedHotels.map(hotel => `- ${hotel}`).join('\n');
  }
  
  return processed.trim();
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'Content generation service is not properly configured' },
        { status: 503 }
      );
    }

    // Parse the request body once to get all needed variables
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    // We need to fetch the city and country names from the database using the IDs
    const { 
      departureCityId, 
      destinationCityId,
      additionalInstructions = '' // This is what the user provides in the form
    } = requestData;

    // Validate required fields
    if (!departureCityId || !destinationCityId) {
      return NextResponse.json(
        { error: 'Missing required fields: departureCityId and destinationCityId' },
        { status: 400 }
      );
    }

    // Fetch city information from database
    const departureCity = await prisma.city.findUnique({
      where: { id: departureCityId },
      include: { country: true }
    });

    const destinationCity = await prisma.city.findUnique({
      where: { id: destinationCityId },
      include: { country: true }
    });

    if (!departureCity || !destinationCity) {
      return NextResponse.json(
        { error: 'Could not find departure or destination city' },
        { status: 404 }
      );
    }

    // Extract needed information
    const departureCityName = departureCity.name;
    const destinationCityName = destinationCity.name;
    const destinationCountryName = destinationCity.country.name;

    // Debug log
    console.log(`Generating content for: ${departureCityName} to ${destinationCityName}, ${destinationCountryName}`);
    console.log(`Additional instructions: ${additionalInstructions.substring(0, 100)}${additionalInstructions.length > 100 ? '...' : ''}`);

    // Prepare prompt for OpenAI
    // Updated System Prompt (2025-04-02)
    const systemMessage = `You are a professional travel writer creating SEO-optimized descriptions for intercity and airport shuttle routes. Your goal is to produce clear, concise, and informative content for travelers booking point-to-point transport. Always return a valid JSON object with the fields: metaTitle, metaDescription, metaKeywords, and seoDescription. Do not include markdown, code formatting, or additional commentary.`;

    // Preprocess the additional instructions
    const processedInstructions = preprocessAdditionalInstructions(additionalInstructions);
    
    // Check if additional info was provided
    const hasAdditionalInfo = processedInstructions && processedInstructions.trim().length > 0;
    
    // Parse for any city or hotel lists in the processed instructions
    const hasCityList = hasAdditionalInfo && /cities\s*served\s*:/i.test(processedInstructions);
    const hasHotelList = hasAdditionalInfo && /hotels\s*served\s*:/i.test(processedInstructions);
    
    console.log("Preprocessed additional instructions:", processedInstructions.length > 100 
      ? processedInstructions.substring(0, 100) + '...' 
      : processedInstructions);

    // Updated User Prompt (2025-04-02)
    // Note: The placeholders [departure city], [destination city], [destination country], [attraction 1], [attraction 2] will be filled dynamically.
    const userMessage = `Write a professional, SEO-optimized description for a shuttle route from ${departureCityName} to ${destinationCityName} in ${destinationCountryName}. This is a point-to-point shuttle service typically used for airport or intercity travel. Our platform connects travelers with local shuttle providers. Do not imply the platform operates the shuttles.

Return a JSON object in this format:
{
  "metaTitle": "${departureCityName} to ${destinationCityName}, ${destinationCountryName} | Shuttle & Transfer Service",
  "metaDescription": "150–160 character summary focused on the route and destination. Use clear and professional language.",
  "metaKeywords": "${departureCityName}, ${destinationCityName}, ${destinationCountryName} shuttle, airport transfer, city-to-city transport, [attraction 1], [attraction 2]",
  "seoDescription": "[200–300 word description in two paragraphs as detailed below]"
}

seoDescription Structure:

Paragraph 1 – Transport Overview:
- Introduce the shuttle service as a practical, point-to-point transfer.
- State that BookShuttles.com connects travelers with local providers.
- You may mention general amenities such as Wi-Fi, air conditioning, reclining seats, airport greeting, charging ports, or refreshment stops.
- If amenities are mentioned, include the line: “Amenities and services may vary by provider. Please review individual listings before booking.”
- Use neutral, professional language.

Paragraph 2 – Destination Highlights:
- Include one reference to visiting the destination (e.g., “If you’re spending time in ${destinationCityName}…”)
- Mention 2–3 named attractions (parks, beaches, landmarks, etc.)
- Optionally end with a modest promotional line (e.g., “A simple way to reach ${destinationCityName} and enjoy everything it has to offer.”)

Do not include markdown or formatting.`;

    // Enhanced debugging logs
    console.log("---------- CONTENT GENERATION REQUEST ----------");
    console.log(`Route: ${departureCityName} to ${destinationCityName}`);
    console.log("SYSTEM MESSAGE:", systemMessage.substring(0, 100) + "...");
    console.log("USER MESSAGE SAMPLE:", userMessage.substring(0, 200) + "...");
    console.log("USER MESSAGE TOTAL LENGTH:", userMessage.length);
    console.log("PROCESSED INSTRUCTIONS LENGTH:", processedInstructions.length);
    if (processedInstructions.length > 0) {
      console.log("PROCESSED INSTRUCTIONS SAMPLE:", processedInstructions.substring(0, 150) + "...");
    }
    
    // Function to process the seoDescription to ensure proper paragraph spacing
    const processDescription = (description: string): string => {
      if (!description) return '';
      
      // Ensure paragraph breaks are properly formatted
      let processed = description;
      
      // First, normalize all newlines to \n
      processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Ensure proper paragraph breaks with double newlines
      processed = processed.replace(/\n{3,}/g, '\n\n'); // No more than double newlines
      
      // Explicitly replace single newlines with double newlines for better consistency across environments
      processed = processed.replace(/\n(?!\n)/g, '\n\n');
      
      // If there's a lot of text with no paragraph breaks, try to add some
      if (!processed.includes('\n\n') && processed.length > 300) {
        // Look for potential paragraph breaks (sentences that end with periods followed by spaces)
        // But avoid breaking up bulleted lists
        const sentences: string[] = processed.split(/(?<=\.)\s+(?=[A-Z])/g);
        
        if (sentences.length >= 3) {
          // Group sentences into reasonable paragraph sizes (2-4 sentences)
          const paragraphs: string[] = [];
          const currentParagraph: string[] = [];
          
          for (const sentence of sentences) {
            currentParagraph.push(sentence);
            
            // Check if we have enough sentences for a paragraph
            if (currentParagraph.length >= 3 || 
                (currentParagraph.length >= 2 && currentParagraph.join(' ').length > 150)) {
              paragraphs.push(currentParagraph.join(' '));
              currentParagraph.length = 0; // Clear the array
            }
          }
          
          // Add any remaining sentences
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' '));
          }
          
          // Join paragraphs with double newlines
          processed = paragraphs.join('\n\n');
        }
      }
      
      // Process line by line to preserve bullet points
      const lines = processed.split('\n');
      let result = '';
      let inList = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        
        // Check if this is a list header or bullet item
        if (line.match(/^(Cities Served:|Hotels Served:)/) || 
            nextLine.match(/^- /) || line.match(/^- /)) {
          inList = true;
          result += line + '\n';
        } else if (inList && line.trim() === '') {
          // Empty line after list ends the list context
          inList = false;
          result += '\n\n';
        } else if (inList) {
          // Still in list context
          result += line + '\n';
        } else {
          // Regular paragraph text - add double newline if not already there
          const needsNewline = !result.endsWith('\n\n') && result.length > 0;
          result += line + (needsNewline ? '\n\n' : '');
        }
      }
      
      // Ensure there aren't excessive newlines (more than 2)
      processed = result.trim().replace(/\n{3,}/g, '\n\n');
      
      // Ensure even empty lines are preserved by replacing with HTML paragraph breaks
      processed = processed.replace(/\n\n/g, '\n\n');
      
      return processed;
    };

    // Function to generate content, with retry capability
    const generateContent = async (retryCount = 0, maxRetries = 2) => {
      console.log(`Generate attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      try {
        // Generate content with OpenAI
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.2, // Even lower temperature for stricter adherence to instructions
          max_tokens: 2000  // Increased tokens to handle longer content
        });

        // Get the response text
        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new Error('No response from OpenAI');
        }

        // Log raw response for debugging
        console.log("RAW OPENAI RESPONSE LENGTH:", responseText.length);
        console.log("RAW OPENAI RESPONSE SAMPLE:", responseText.substring(0, 200) + "...");
        
        // Clean the response text to remove any potential control characters
        const cleanedText = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        // Parse the cleaned JSON
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(cleanedText);
          console.log("Successfully parsed JSON response");
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          console.error("Raw text that failed to parse:", cleanedText.substring(0, 200) + "...");
          
          // If we have retries left, try again
          if (retryCount < maxRetries) {
            console.log("Retrying due to JSON parse error...");
            return generateContent(retryCount + 1, maxRetries);
          }
          
          throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
        }
        
        // Process the seoDescription to ensure proper paragraph spacing
        if (parsedResponse.seoDescription) {
          parsedResponse.seoDescription = processDescription(parsedResponse.seoDescription);
          
          // Log a sample of processed description
          console.log("PROCESSED DESCRIPTION SAMPLE:", 
            parsedResponse.seoDescription.substring(0, 150).replace(/\n/g, "\\n") + "...");
        }
        
        // Validate required fields
        const requiredFields = ['metaTitle', 'metaDescription', 'metaKeywords', 'seoDescription'];
        for (const field of requiredFields) {
          if (!parsedResponse[field]) {
            if (retryCount < maxRetries) {
              console.log(`Retrying due to missing field: ${field}`);
              return generateContent(retryCount + 1, maxRetries);
            }
            throw new Error(`Missing required field: ${field}`);
          }
          if (typeof parsedResponse[field] !== 'string') {
            if (retryCount < maxRetries) {
              console.log(`Retrying due to invalid field type: ${field}`);
              return generateContent(retryCount + 1, maxRetries);
            }
            throw new Error(`Field ${field} must be a string`);
          }
        }
        
        // Additional validation to ensure the additional instructions were incorporated
        if (hasAdditionalInfo) {
          // Validation function from above
          const validateContentIncorporation = (generatedText: string, originalText: string) => {
            const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'is', 'are', 'was', 'were']);
            const significantWords = originalText
              .toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 3 && !commonWords.has(word))
              .map(word => word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""));
            
            const uniqueSignificantWords = [...new Set(significantWords)];
            const keywordsToCheck = uniqueSignificantWords.slice(0, Math.min(8, uniqueSignificantWords.length));
            
            const matchCount = keywordsToCheck.filter(word => 
              generatedText.toLowerCase().includes(word)
            ).length;
            
            const matchPercentage = (matchCount / keywordsToCheck.length) * 100;
            
            console.log(`Content validation: ${matchCount}/${keywordsToCheck.length} key terms found (${matchPercentage.toFixed(1)}%)`);
            console.log(`Key terms checked: ${keywordsToCheck.join(', ')}`);
            
            return { 
              isValid: matchPercentage >= 70, 
              percentage: matchPercentage 
            };
          };
          
          // Check if the additional instructions were properly incorporated
          const validation = validateContentIncorporation(
            parsedResponse.seoDescription,
            processedInstructions
          );
          
          // If content wasn't incorporated well, retry if we have attempts left
          if (!validation.isValid && retryCount < maxRetries) {
            console.log(`Retrying due to poor content incorporation (${validation.percentage.toFixed(1)}%)`);
            return generateContent(retryCount + 1, maxRetries);
          } else if (!validation.isValid) {
            console.warn(`Warning: Additional instructions poorly incorporated (${validation.percentage.toFixed(1)}%), but out of retries.`);
          }
        }

        // Add displayName field
        parsedResponse.displayName = `Shuttles from ${departureCityName} to ${destinationCityName}`;
        
        console.log("Content generation successful");
        return parsedResponse;
      } catch (error) {
        // If we have retries left for any error, try again
        if (retryCount < maxRetries) {
          console.log(`Retrying due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return generateContent(retryCount + 1, maxRetries);
        }
        throw error;
      }
    };
    
    // Execute content generation with retry capability
    const parsedResponse = await generateContent();
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}
