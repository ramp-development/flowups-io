/**
 * Title Extractor
 *
 * Extract titles from elements with priority resolution.
 */

import type { TitleExtractionResult } from '../../types/config';
import { generateIdFromTitle } from './generate-id-from-title';

/**
 * Extract title from <legend> element
 *
 * Used for sets and groups that use <fieldset>
 *
 * @param element - The element to search within
 * @returns Legend text content or null
 *
 * @example
 * extractTitleFromLegend(setElement) // "Contact Details"
 */
export function extractTitleFromLegend(element: HTMLElement): string | null {
  const legend = element.querySelector('legend');
  return legend?.textContent?.trim() || null;
}

/**
 * Extract title with priority resolution
 *
 * Priority:
 * 1. Explicit title attribute (data-form-{type}title)
 * 2. <legend> text content (for sets/groups)
 * 3. Combined syntax ID (data-form-element="type:id")
 * 4. Auto-generate from index
 *
 * @param element - The DOM element
 * @param elementType - Type of element (card, set, group)
 * @param combinedId - ID from combined syntax (if any)
 * @param index - Element index (for fallback)
 * @returns Title extraction result
 *
 * @example
 * extractTitle(setElement, 'set', undefined, 0)
 * // Returns: { title: 'Contact Details', source: 'legend', id: 'contact-details' }
 */
export function extractTitle(
  element: HTMLElement,
  elementType: 'card' | 'set' | 'group',
  combinedId: string | undefined,
  index: number
): TitleExtractionResult {
  // Priority 1: Explicit title attribute
  const titleAttr = element.getAttribute(`data-form-${elementType}title`);
  if (titleAttr?.trim()) {
    const title = titleAttr.trim();
    return {
      title,
      source: 'attribute',
      id: combinedId || generateIdFromTitle(title),
    };
  }

  // Priority 2: <legend> text content (for sets and groups)
  if (elementType === 'set' || elementType === 'group') {
    const legendTitle = extractTitleFromLegend(element);
    if (legendTitle) {
      return {
        title: legendTitle,
        source: 'legend',
        id: combinedId || generateIdFromTitle(legendTitle),
      };
    }
  }

  // Priority 3: Combined syntax ID
  if (combinedId) {
    // Convert ID to title (kebab-case to Title Case)
    const title = combinedId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      title,
      source: 'attribute',
      id: combinedId,
    };
  }

  // Priority 4: Auto-generate from index
  const generatedId = `${elementType}-${index}`;
  const generatedTitle = `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} ${
    index + 1
  }`;

  return {
    title: generatedTitle,
    source: 'generated',
    id: generatedId,
  };
}
