import type { IBaseManager } from './base-manager';

/**
 * Render Manager Interface
 * Handles dynamic text and style updates
 */
export interface IRenderManager extends IBaseManager {
  /** Discover all render elements */
  discoverRenderElements(): void;

  /** Update all text content elements */
  updateTextContent(): void;

  /** Update all style elements */
  updateStyles(): void;

  /** Update all renders (text + styles) */
  updateAll(): void;
}
