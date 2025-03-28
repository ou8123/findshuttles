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

  const from = "àáâäæãåāçćčèéêëēėęîïíīįìłñńôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
  const to   = "aaaaaaaacccceeeeeeeiiiiilnnoooooooopprrsssssttuuuuuuuuuwxyyzzz------";
  const p = new RegExp(from.split('').join('|'), 'g');

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => to.charAt(from.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}