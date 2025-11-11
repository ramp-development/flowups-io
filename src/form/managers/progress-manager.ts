import { ATTR } from '../constants';
import type {
  ProgressItem,
  ProgressParentElement,
  ProgressParentHierarchy,
} from '../types/items/progress-item';
import { parseElementAttribute } from '../utils';
import { HierarchyBuilder } from '../utils/managers/hierarchy-builder';
import { ItemStore } from '../utils/managers/item-store';
import { BaseManager } from './base-manager';

export class ProgressManager extends BaseManager {
  private store = new ItemStore<ProgressItem>();

  public init(): void {
    this.groupStart(`Initializing Progress`);
    this.discoverItems();
    this.setupEventListeners();

    this.form.logDebug('Initialized');
    this.groupEnd();
  }

  public destroy(): void {
    this.store.clear();
  }

  private discoverItems(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.form.createError('Cannot discover progress items: root element is null', 'init', {
        cause: rootElement,
      });
    }

    // Query all buttons
    const items = this.form.queryAll<HTMLElement>(`[${ATTR}-element="progress-line"]`);

    this.store.clear();

    items.forEach((item, index) => {
      const itemData = this.createItemData(item, index);
      if (!itemData) return;

      this.store.add(itemData);
    });

    this.form.logDebug(`Discovered ${this.store.length} progress lines`, {
      items: this.store.getAll(),
    });
  }

  private createItemData(element: HTMLElement, index: number): ProgressItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);
    if (!parsed) return;

    return this.buildItemData({
      element,
      index,
      id: parsed.id ?? `progress-line-${index}`,
      active: false, // Calculated
      type: parsed.type,
      parentHierarchy: this.findParentHierarchy(element),
    });
  }

  private buildItemData(item: ProgressItem): ProgressItem {
    return {
      ...item,
      active: true,
    };
  }

  private findParentHierarchy(child: HTMLElement): ProgressParentHierarchy {
    return HierarchyBuilder.findParentHierarchy<ProgressParentHierarchy>(
      child,
      this.form,
      (element) => this.findParentItem(element)
    );
  }

  /**
   * Find the parent item for a field
   *
   * @param element - The field element
   * @returns Parent data or null
   */
  protected findParentItem(element: HTMLElement): ProgressParentElement | undefined {
    const parentGroup = HierarchyBuilder.findParentByElement(element, 'group', () =>
      this.form.groupManager.getAll()
    );

    const parentSet = HierarchyBuilder.findParentByElement(element, 'set', () =>
      this.form.setManager.getAll()
    );

    const parentCard = HierarchyBuilder.findParentByElement(element, 'card', () =>
      this.form.cardManager.getAll()
    );

    return parentGroup ?? parentSet ?? parentCard;
  }

  private setupEventListeners(): void {
    this.form.subscribe('form:navigation:changed', (payload) => {
      console.log('form:navigation:changed', payload);
      this.updateProgress();
    });
  }

  private updateProgress(): void {
    this.store.getAll().forEach((item) => {
      item.element.style.setProperty('--progress', this.getProgress(item).toString());
    });
  }

  private getProgress(item: ProgressItem): number {
    console.log('getProgress', item);
    if (!item.parentHierarchy) return 0;

    const { parentHierarchy } = item;
    if ('groupIndex' in parentHierarchy && typeof parentHierarchy.groupIndex === 'number') {
      const group = this.form.groupManager.getByIndex(parentHierarchy.groupIndex);
      return group?.progress ?? 0;
    }

    if ('setIndex' in parentHierarchy && typeof parentHierarchy.setIndex === 'number') {
      const set = this.form.setManager.getByIndex(parentHierarchy.setIndex);
      return set?.progress ?? 0;
    }

    if ('cardIndex' in parentHierarchy && typeof parentHierarchy.cardIndex === 'number') {
      const card = this.form.cardManager.getByIndex(parentHierarchy.cardIndex);
      console.log('card', card);
      return card?.progress ?? 0;
    }

    return 100;
  }
}
