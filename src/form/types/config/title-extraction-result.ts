/**
 * Title Extraction Result
 * Result of extracting title from <legend> or attribute
 */
export interface TitleExtractionResult {
  /** Extracted title */
  title: string;

  /** Source of the title */
  source: 'legend' | 'attribute' | 'generated';

  /** Generated ID from title */
  id: string;
}
