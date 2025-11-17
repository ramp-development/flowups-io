import { ATTR } from '../constants';
import type {
  ErrorItem,
  ErrorParentElement,
  ErrorParentHierarchy,
  ErrorTriggeredEvent,
} from '../types';
import { HierarchyBuilder, ItemStore, parseElementAttribute } from '../utils';
import { BaseManager } from './base-manager';

export class ErrorManager extends BaseManager {
  private store = new ItemStore<ErrorItem>();
  protected readonly itemType = 'error';

  /**
   * Initialize the manager
   */
  public init(): void {
    this.groupStart(`Initializing Error`);
    this.discoverItems();
    this.initializeErrors();
    this.setupEventListeners();

    this.logDebug('Initialized');
    this.groupEnd();
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.store.clear();
    this.logDebug('ErrorManager destroyed');
  }

  private discoverItems(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.form.createError('Cannot discover error items: root element is null', 'init', {
        cause: rootElement,
      });
    }

    // Query all buttons
    const items = this.form.queryAll<HTMLElement>(`[${ATTR}-element="error"]`);

    this.store.clear();

    items.forEach((item, index) => {
      const itemData = this.createItemData(item, index);
      if (!itemData) return;

      this.store.add(itemData);
    });

    this.logDebug(`Discovered ${this.store.length} error items`, {
      items: this.store.getAll(),
    });
  }

  private createItemData(element: HTMLElement, index: number): ErrorItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);
    if (!parsed) return;

    // Skip if not an error
    if (parsed.type !== 'error') return;

    return this.buildItemData({
      element,
      index,
      id: parsed.id ?? `error-${index}`,
      visible: false,
      active: false,
      type: parsed.type,
      parentHierarchy: this.findParentHierarchy(element),
    });
  }

  private buildItemData(item: ErrorItem): ErrorItem {
    return {
      ...item,
    };
  }

  private findParentHierarchy(child: HTMLElement): ErrorParentHierarchy {
    return HierarchyBuilder.findParentHierarchy<ErrorParentHierarchy>(child, this.form, (element) =>
      this.findParentItem(element)
    );
  }

  /**
   * Find the parent item for an error
   *
   * @param element - The error element
   * @returns Parent data or undefined
   */
  protected findParentItem(element: HTMLElement): ErrorParentElement | undefined {
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

  private initializeErrors(): void {
    this.store.getAll().forEach((item) => {
      item.element.style.setProperty('display', 'none');
    });
  }

  private setupEventListeners(): void {
    this.form.subscribe('form:error:triggered', (payload) => this.handleErrorTriggered(payload));
    this.form.subscribe('form:error:cleared', () => this.handleErrorCleared());
  }

  private handleErrorTriggered(payload: ErrorTriggeredEvent): void {
    this.store.getAll().forEach((item) => {
      item.element.textContent = payload.message;
      item.element.style.removeProperty('display');
    });

    if (payload.timeout) {
      setTimeout(() => {
        this.handleErrorCleared();
      }, payload.timeout);
    }
  }

  private handleErrorCleared(): void {
    this.store.getAll().forEach((item) => {
      item.element.style.setProperty('display', 'none');
    });
  }
}
