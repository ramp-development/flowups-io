import type { GroupElement } from '../elements';
import type { IBaseManager } from './base-manager';

/**
 * Group Manager Interface
 * Handles group discovery and navigation (optional elements)
 */
export interface IGroupManager extends IBaseManager {
  /** Discover all groups in the form */
  discoverGroups(): void;

  /** Extract title from <legend> or attribute */
  extractGroupTitle(groupElement: HTMLElement): string;

  /** Get total number of groups */
  getTotalGroups(): number;

  /** Get group by index */
  getGroupByIndex(index: number): GroupElement | null;

  /** Get group by ID */
  getGroupById(id: string): GroupElement | null;

  /** Get current group */
  getCurrentGroup(): GroupElement | null;
}
