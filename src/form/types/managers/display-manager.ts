import type { IBaseManager } from './base-manager';
import type { ElementData } from './element-manager';

/**
 * Display Manager Interface
 * Handles showing/hiding elements based on navigation (without animations)
 */
export interface IDisplayManager extends IBaseManager {
  /** Show an element */
  showElement(elementData: ElementData): void;
}
