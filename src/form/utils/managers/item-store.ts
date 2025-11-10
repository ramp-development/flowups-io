import type { BaseItem } from 'src/form/types';

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
  public merge(item: TItem, data: Partial<TItem>): void {
    const updated = { ...item, ...data };
    this.update(updated);
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
    return typeof selector === 'string' ? this.getById(selector) : this.getByIndex(selector);
  }

  /** Get by DOM */
  public getByDOM(dom: HTMLElement): TItem | undefined {
    return this.items.find((item) => item.element === dom);
  }

  /** Filter items by predicate */
  public filter(predicate: (item: TItem) => boolean): TItem[] {
    return this.items.filter(predicate);
  }

  /** Filter items by predicate */
  public find(predicate: (item: TItem) => boolean): TItem | undefined {
    return this.items.find(predicate);
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
