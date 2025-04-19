import prisma from '@/lib/prisma';

// Map of phrases to amenity names
const AMENITY_TRIGGERS = {
  // Bilingual Driver Triggers
  'bilingual driver': 'Bilingual Driver',
  'english speaking driver': 'Bilingual Driver',
  'spanish speaking driver': 'Bilingual Driver',
  'english and spanish': 'Bilingual Driver',
  'speaks english': 'Bilingual Driver',
  'speaks spanish': 'Bilingual Driver',
  'bilingual professionals': 'Bilingual Driver', // Added
  'hotel': 'Hotel Pickup',
  'resort': 'Hotel Pickup',
  'pickup from hotel': 'Hotel Pickup',
  'dropoff at hotel': 'Hotel Pickup',
  'hotel pickup': 'Hotel Pickup',
  'hotel drop': 'Hotel Pickup',
  'from sjo airport to hotel': 'Hotel Pickup',
  'from hotel resort to sjo airport': 'Hotel Pickup',
  'to the hotel': 'Hotel Pickup',

  'air-conditioned': 'A/C',
  'air conditioned': 'A/C',
  'a/c': 'A/C',
  'ac': 'A/C',
  'air conditioning': 'A/C',
  'climate control': 'A/C',
  'air conditioned vehicle': 'A/C',
  'comfortable air conditioned': 'A/C',
  'fully equipped with ac': 'A/C',
  'modern mini bus fully equipped': 'A/C',

  'wi-fi': 'WiFi',
  'wifi': 'WiFi',
  'wireless internet': 'WiFi',
  'internet': 'WiFi',

  'bottle of water': 'Bottled Water',
  'complimentary water': 'Bottled Water',
  'water provided': 'Bottled Water',
  'free water': 'Bottled Water',
  'bottled water': 'Bottled Water',
  'bottle of water for each': 'Bottled Water',
  'service include a bottle of water': 'Bottled Water',
  'service includes a bottle of water': 'Bottled Water',
  'service include a bottle': 'Bottled Water',
  'water bottle': 'Bottled Water', // Added

  'photo stop': 'Driver Will Make Stops on Request',
  'stop for photos': 'Driver Will Make Stops on Request',
  'buy at any store': 'Driver Will Make Stops on Request',
  'rest stop': 'Driver Will Make Stops on Request',
  'restaurant stop': 'Driver Will Make Stops on Request',
  'stops on request': 'Driver Will Make Stops on Request',
  'can stop': 'Driver Will Make Stops on Request',
  'will stop': 'Driver Will Make Stops on Request',
  'make stops': 'Driver Will Make Stops on Request',
  'bathrooms': 'Driver Will Make Stops on Request',
  'take a picture': 'Driver Will Make Stops on Request',
  'anything that travelers would like': 'Driver Will Make Stops on Request',
  'anything travelers would like to do': 'Driver Will Make Stops on Request',
  'stopping to take photos': 'Driver Will Make Stops on Request',
  'stopping to take': 'Driver Will Make Stops on Request',
  'driver can stop': 'Driver Will Make Stops on Request',
  'along the way if': 'Driver Will Make Stops on Request',
  'one hour of free time to stop': 'Driver Will Make Stops on Request', // Added
  'free wait time': 'Driver Will Make Stops on Request', // Added (Note: might overlap with Flight Delay Friendly)
  'stop for photographs': 'Driver Will Make Stops on Request', // Added

  'flight delay': 'Flight Delay Friendly',
  'waiting for delayed flight': 'Flight Delay Friendly',
  'no extra charge for delays': 'Flight Delay Friendly',
  'flight monitoring': 'Flight Delay Friendly',
  'monitor flight': 'Flight Delay Friendly',
  'track flight': 'Flight Delay Friendly',
  'delayed flight': 'Flight Delay Friendly',
  'flight is delayed': 'Flight Delay Friendly',
  'if for any reason the flight is delayed': 'Flight Delay Friendly',
  'no additional cost for the wait': 'Flight Delay Friendly',
  'no matter what time': 'Flight Delay Friendly',
  'let us know of the delay': 'Flight Delay Friendly',
  'will be waiting for travelers': 'Flight Delay Friendly',
  'no additional cost': 'Flight Delay Friendly',
  'holding a sign': 'Flight Delay Friendly',
  'holding a sign with the name': 'Flight Delay Friendly',
  'travelers dont have to worry': 'Flight Delay Friendly',
  'service will be waiting': 'Flight Delay Friendly',
  'no matter what time travelers arrive': 'Flight Delay Friendly',

  'private transfer': 'Private Shuttle',
  'just for the group': 'Private Shuttle',
  'private transportation': 'Private Shuttle',
  'private vehicle': 'Private Shuttle',
  'private service': 'Private Shuttle',
  'private shuttle': 'Private Shuttle',
  'exclusive service': 'Private Shuttle',
  'exclusive transfer': 'Private Shuttle',
  'private tour/activity': 'Private Shuttle',
  'this is a private transfer': 'Private Shuttle',
  'this is a private tour': 'Private Shuttle',
  'only the group': 'Private Shuttle',
  'only your group': 'Private Shuttle',
  'this is a private tour/activity': 'Private Shuttle',
  'only your group will participate': 'Private Shuttle',
  'private tour': 'Private Shuttle',
  'this is a private': 'Private Shuttle',
  'only the group will participate': 'Private Shuttle',

  'wheelchair': 'Wheelchair Accessible',
  // Removed: 'accessible': 'Wheelchair Accessible', // Too broad
  'handicap': 'Wheelchair Accessible',
  'disability': 'Wheelchair Accessible',
  'wheelchair accessible': 'Wheelchair Accessible',
  'transportation is wheelchair accessible': 'Wheelchair Accessible',
  'surfaces are wheelchair accessible': 'Wheelchair Accessible',

  'infant seat': 'Child Seats Available',
  'child seat': 'Child Seats Available',
  'car seat': 'Child Seats Available',
  'stroller': 'Child Seats Available',
  'stroller accessible': 'Child Seats Available', // Added explicit trigger
  'baby seat': 'Child Seats Available',
  'booster seat': 'Child Seats Available',
  'infant seats available': 'Child Seats Available',
  'travelling with children': 'Child Seats Available', // Renamed target

  'service animal': 'Service Animals Allowed',
  'service animals allowed': 'Service Animals Allowed',
  'travelling with pets': 'Service Animals Allowed',
  'if travelers are travelling with pets': 'Service Animals Allowed',
  'indicate in the comments': 'Service Animals Allowed',
  'indicate it in the comments': 'Service Animals Allowed',
  'indicate in the additional comments': 'Service Animals Allowed',
};

/**
 * Matches amenities based on route description text
 * @param description The route description to analyze
 * @param additionalInstructions Optional additional instructions to analyze
 * @returns Array of matched amenity names
 */
export async function matchAmenities(description: string, additionalInstructions?: string): Promise<string[]> {
  const matchedAmenityNames = new Set<string>();

  // Helper function to normalize text for matching
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[.,•\(\)]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();
  };

  // Helper function to check text for matches
  const checkText = (text: string, source: string) => {
    if (!text) return;
    const normalizedText = normalizeText(text);
    
    // Debug logging
    console.log(`\nChecking ${source} for amenities:`, normalizedText.substring(0, 100) + '...');
    console.log('Normalized text:', normalizedText);

    // Check each trigger phrase
    for (const [trigger, amenityName] of Object.entries(AMENITY_TRIGGERS)) {
      const normalizedTrigger = normalizeText(trigger);
      // --- Add specific debug log for 'infant seats available' ---
      if (trigger === 'infant seats available') {
        console.log(`[DEBUG] Comparing for '${trigger}':`);
        console.log(`  Normalized Text Snippet: "...${normalizedText.substring(Math.max(0, normalizedText.indexOf('infant') - 10), Math.min(normalizedText.length, normalizedText.indexOf('infant') + 30))}..."`);
        console.log(`  Normalized Trigger: "${normalizedTrigger}"`);
        console.log(`  Includes Check Result: ${normalizedText.includes(normalizedTrigger)}`);
      }
      // --- End specific debug log ---
      if (normalizedText.includes(normalizedTrigger)) {
        matchedAmenityNames.add(amenityName);
        console.log(`✓ Found match in ${source}: "${trigger}" -> "${amenityName}" (at position ${normalizedText.indexOf(normalizedTrigger)})`);
      }
    }
  };

  // Check both fields for maximum coverage
  checkText(description, 'SEO Description');
  if (additionalInstructions) {
    checkText(additionalInstructions, 'Additional Instructions');
  }

  const matches = Array.from(matchedAmenityNames);
  console.log('\nFinal amenity matches:', matches);
  return matches;
}

/**
 * Updates a route's amenities based on its description and additional instructions
 * @param routeId The ID of the route to update
 * @param description The route description to analyze
 * @param additionalInstructions Optional additional instructions to analyze
 */
export async function updateRouteAmenities(routeId: string, description: string, additionalInstructions?: string) {
  try {
    // Get matched amenity names
    const matchedAmenityNames = await matchAmenities(description, additionalInstructions);

    // Find or create each amenity and get their IDs
    const amenityIds = await Promise.all(
      matchedAmenityNames.map(async (name) => {
        const amenity = await prisma.amenity.upsert({
          where: { name },
          create: { name },
          update: {} // Don't update if exists
        });
        return amenity.id;
      })
    );

    // Update route's amenities
    await prisma.route.update({
      where: { id: routeId },
      data: {
        amenities: {
          set: amenityIds.map(id => ({ id }))
        }
      }
    });

  } catch (error) {
    console.error('Error updating route amenities:', error);
    throw error;
  }
}
