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

  // Normalize the string to decompose combined characters (like accents)
  // and then remove the accent characters (Unicode range U+0300 to U+036f)
  const normalizedText = text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalizedText
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    // .replace(p, c => to.charAt(from.indexOf(c))) // Removed old method
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars (keeps letters, numbers, hyphen)
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}
