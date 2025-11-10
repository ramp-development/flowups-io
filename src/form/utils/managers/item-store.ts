import type { BaseItem, UpdatableItemData } from 'src/form/types';

/**
 * Shared storage and lookup utilities for items
 * Used by composition, not inheritance
 */
export class ItemStore<TItem extends BaseItem> {
  private items: TItem[] = [];
  private itemMap: Map<string, TItem> = new Map();

  /** Add item to storage */
  public add(item: TItem): void {
    this.items.push(item);
    this.itemMap.set(item.id, item);
  }

  /** Update item in storage */
  public update(item: TItem): void {
    this.itemMap.set(item.id, item);
    this.items[item.index] = item;
  }

  /** Update item data by merging */
  public merge(item: TItem, data: UpdatableItemData<TItem>): TItem | undefined {
    const updated = { ...item, ...data };
    this.update(updated);

    return updated;
  }

  /** Get all items */
  public getAll(): TItem[] {
    return this.items;
  }

  /** Get by ID */
  public getById(id: string): TItem | undefined {
    return this.itemMap.get(id);
  }

  /** Get by index */
  public getByIndex(index: number): TItem | undefined {
    return this.items.find((item) => item.index === index);
  }

  /** Get by selector (ID or index) */
  public getBySelector(selector: string | number): TItem | undefined {
    return typeof selector === 'number' ? this.getByIndex(selector) : this.getById(selector);
  }

  /** Filter items by predicate */
  public filter(predicate: (item: TItem) => boolean): TItem[] {
    return this.items.filter(predicate);
  }

  /** Clear all items */
  public clear(): void {
    this.items = [];
    this.itemMap.clear();
  }

  /** Get count */
  public get length(): number {
    return this.items.length;
  }
}
