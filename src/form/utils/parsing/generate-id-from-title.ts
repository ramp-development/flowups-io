/**
 * ID Generator
 *
 * Generate kebab-case IDs from titles.
 */

/**
 * Generate ID from title
 *
 * Converts title to kebab-case ID
 *
 * @param title - The title string
 * @returns Kebab-case ID
 *
 * @example
 * generateIdFromTitle('Contact Details') // "contact-details"
 * generateIdFromTitle('Personal Info') // "personal-info"
 */
export function generateIdFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
