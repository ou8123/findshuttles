const cloudName = "dawjqh1qv";
const baseImage = "book_shuttles_logo_og_banner_lezyqm.png"; // Ensure this is the correct public ID

/**
 * Scales font size linearly based on text length.
 * @param text The text string.
 * @param max Max font size.
 * @param min Min font size.
 * @returns Calculated font size.
 */
function scaleFont(text: string, max: number, min: number): number {
  const length = text.length;
  const maxLengthThreshold = 40; // Text length at which min font size is used
  const minLengthThreshold = 20; // Text length at which max font size is used

  if (length <= minLengthThreshold) return max;
  if (length >= maxLengthThreshold) return min;

  // Linear interpolation between min and max thresholds
  return Math.floor(max - ((length - minLengthThreshold) * (max - min)) / (maxLengthThreshold - minLengthThreshold));
}

/**
 * Generates a dynamic Cloudinary URL for an OG image with text overlays.
 * Includes auto-scaling font size for the main route text.
 * @param from Departure city name.
 * @param to Destination city name.
 * @returns The full Cloudinary image URL.
 */
export function generateOgImageUrl(from: string, to: string): string {
  // Basic sanitization
  const cleanFrom = from?.replace(/[()]/g, '').trim() || 'Location';
  const cleanTo = to?.replace(/[()]/g, '').trim() || 'Destination';

  const routeText = `${cleanFrom} → ${cleanTo}`;
  const tagline = `Shuttle Service · BookShuttles.com`;

  // URL-encode text components for Cloudinary URL (Simpler encoding)
  // Cloudinary generally handles standard URI encoding well for l_text
  const encodeCloudinaryText = (text: string): string => {
    // Replace commas and slashes manually as they are delimiters in Cloudinary URLs
    const replacedText = text.replace(/,/g, '%2C').replace(/\//g, '%2F');
    return encodeURIComponent(replacedText);
  };

  const routeEncoded = encodeCloudinaryText(routeText);
  const taglineEncoded = encodeCloudinaryText(tagline);

  // Determine font sizes and color
  const mainFontSize = scaleFont(routeText, 60, 40); // Adjusted scaling range slightly
  const subFontSize = 30; // Tagline size
  const textColor = 'co_rgb:004d3b'; // Dark green color

  // Construct transformations string
  const transformations = [
    `w_1200,h_630,c_pad,b_white`, // Base canvas size and padding
    `l_text:Arial_${mainFontSize}_bold:${routeEncoded},${textColor},g_south,y_110`, // Main route text (Arial bold, green, lower)
    `l_text:Arial_${subFontSize}:${taglineEncoded},${textColor},g_south,y_50`  // Tagline text (Arial regular, green, lowest)
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${baseImage}`;
}
