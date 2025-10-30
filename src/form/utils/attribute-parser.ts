/**
 * Attribute Parser Utilities
 *
 * Parse data-form-* attributes and extract element information.
 */

import type { AttributeConfig, ParsedElementData, TitleExtractionResult } from '../types/config';
import type { FormElementType } from '../types/elements';

/**
 * Valid form element types for validation
 */
const VALID_ELEMENT_TYPES: FormElementType[] = [
  'form',
  'card',
  'set',
  'group',
  'field',
  'prev',
  'next',
  'submit',
  'error',
];

/**
 * Check if string is a valid FormElementType
 *
 * @param value - String to check
 * @returns True if valid element type
 */
export function isValidElementType(value: string): value is FormElementType {
  return VALID_ELEMENT_TYPES.includes(value as FormElementType);
}

/**
 * Parse data-form-element attribute
 *
 * Supports combined syntax: "card:intro" or simple: "card"
 *
 * @param value - Attribute value
 * @returns Parsed element type and optional ID
 * @throws Error if element type is invalid
 *
 * @example
 * parseElementAttribute('card:intro') // { type: 'card', id: 'intro' }
 * parseElementAttribute('card') // { type: 'card', id: undefined }
 */
export function parseElementAttribute(value: string): ParsedElementData {
  const trimmed = value.trim();

  // Check for combined syntax (element:id)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const type = parts[0].trim();

    if (!isValidElementType(type)) {
      throw new Error(
        `Invalid element type "${type}". Valid types are: ${VALID_ELEMENT_TYPES.join(', ')}`
      );
    }

    return {
      type,
      id: parts[1].trim(),
    };
  }

  // Simple syntax (just element type)
  if (!isValidElementType(trimmed)) {
    throw new Error(
      `Invalid element type "${trimmed}". Valid types are: ${VALID_ELEMENT_TYPES.join(', ')}`
    );
  }

  return {
    type: trimmed,
    id: undefined,
  };
}

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

/**
 * Get all data-form-* attributes from element
 *
 * @param element - The DOM element
 * @returns Parsed attribute configuration
 *
 * @example
 * getFormAttributes(element)
 * // Returns: { element: 'card', cardtitle: 'Introduction', transition: 'fade', ... }
 */
export function getFormAttributes(element: HTMLElement): AttributeConfig {
  const config: AttributeConfig = {};

  // Get all attributes
  Array.from(element.attributes).forEach((attr) => {
    if (attr.name.startsWith('data-form-')) {
      // Remove 'data-form-' prefix and use as key
      const key = attr.name.replace('data-form-', '') as keyof AttributeConfig;
      config[key] = attr.value;
    }
  });

  return config;
}

/**
 * Parse boolean attribute value
 *
 * @param value - Attribute value string
 * @param defaultValue - Default value if not set
 * @returns Boolean value
 *
 * @example
 * parseBooleanAttribute('true') // true
 * parseBooleanAttribute('false') // false
 * parseBooleanAttribute(undefined, true) // true
 */
export function parseBooleanAttribute(
  value: string | undefined,
  defaultValue: boolean = false
): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '';
}

/**
 * Parse number attribute value
 *
 * @param value - Attribute value string
 * @param defaultValue - Default value if not set or invalid
 * @returns Number value
 *
 * @example
 * parseNumberAttribute('300') // 300
 * parseNumberAttribute('invalid', 500) // 500
 */
export function parseNumberAttribute(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get input element within a field wrapper
 *
 * Finds the first input, select, or textarea within the field element
 *
 * @param fieldElement - The field wrapper element
 * @returns The input element or null
 *
 * @example
 * getInputInField(fieldElement) // <input name="email" />
 */
export function getInputInField(
  fieldElement: HTMLElement
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  return fieldElement.querySelector('input, select, textarea');
}

/**
 * Check if element is hidden via CSS
 *
 * @param element - The DOM element
 * @returns True if element is hidden
 */
export function isElementHidden(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  );
}
