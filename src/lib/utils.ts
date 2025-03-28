// src/lib/utils.ts

/**
 * Generates a URL-friendly slug from a given text string.
 * Converts to lowercase, replaces spaces with hyphens, removes invalid characters,
 * and trims leading/trailing hyphens.
 * @param text The input string.
 * @returns The generated slug.
 */
export function generateSlug(text: string): string {
  if (!text) return ''; // Handle empty input

  return text
    .toString()           // Ensure input is a string
    .toLowerCase()        // Convert to lowercase
    .trim()               // Remove leading/trailing whitespace
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove all non-word chars except hyphens and underscores
    .replace(/--+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-+/, '')   // Trim hyphens from the start
    .replace(/-+$/, '');  // Trim hyphens from the end
}