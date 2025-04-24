const cloudName = "dawjqh1qv";
const baseImage = "book_shuttles_og_image_hcq91q"; // New base image with 1200x630 dimensions

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
  const tagline = `Transfer Service · BookShuttles.com`;

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
  const mainFontSize = scaleFont(routeText, 70, 50); // Reduced font size to ensure text fits
  const subFontSize = 45; // Increased tagline size for better readability
  const textColor = 'co_rgb:004d3b'; // Dark green color

  // Calculate width for text wrapping (80% of image width)
  const textWidth = 960; // 80% of 1200px

  // Construct transformations string
  const transformations = [
    // No need for size transformations as the base image is already 1200x630
    // Position the main route text in the bottom area with plenty of space
    // Add width parameter to enable text wrapping
    `l_text:Arial_${mainFontSize}_bold:${routeEncoded},${textColor},g_south,y_150,w_${textWidth},c_fit`,
    // Position the tagline below the main text
    `l_text:Arial_${subFontSize}:${taglineEncoded},${textColor},g_south,y_80,w_${textWidth},c_fit`
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${baseImage}`;
}
