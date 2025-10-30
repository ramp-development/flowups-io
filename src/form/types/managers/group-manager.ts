import type { BaseManager } from './base-manager';

/**
 * Group Manager Interface
 * Handles group discovery and navigation (optional elements)
 */
export interface GroupManager extends BaseManager {
  /** Discover all groups in the form */
  discoverGroups(): void;

  /** Extract title from <legend> or attribute */
  extractGroupTitle(groupElement: HTMLElement): string;

  /** Get total number of groups */
  getTotalGroups(): number;

  /** Get group by index */
  getGroupByIndex(index: number): HTMLElement | null;

  /** Get group by ID */
  getGroupById(id: string): HTMLElement | null;

  /** Get current group */
  getCurrentGroup(): HTMLElement | null;
}
