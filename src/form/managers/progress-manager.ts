import { ATTR } from '../constants';
import type { FormBehavior } from '../types';
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

    this.logDebug('Initialized');
    this.groupEnd();
  }

  public destroy(): void {
    this.store.clear();
    this.logDebug('ProgressManager destroyed');
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

    this.logDebug(`Discovered ${this.store.length} progress lines`, {
      items: this.store.getAll(),
    });
  }

  private createItemData(element: HTMLElement, index: number): ProgressItem | undefined {
    if (!(element instanceof HTMLElement)) return;

    const attrValue = element.getAttribute(`${ATTR}-element`);
    if (!attrValue) return;

    const parsed = parseElementAttribute(attrValue);
    if (!parsed) return;

    // Skip if not a progress line
    if (parsed.type !== 'progress-line') return;

    return this.buildItemData({
      element,
      index,
      id: parsed.id ?? `progress-line-${index}`,
      visible: true,
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
   * Find the parent item for a progress line
   *
   * @param element - The progress line element
   * @returns Parent data or undefined
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
    this.form.subscribe('form:navigation:changed', () => {
      this.updateProgress();
    });
  }

  private updateProgress(): void {
    this.store.getAll().forEach((item) => {
      const progress = this.getProgressForBehavior(item);
      if (progress === undefined) return;
      item.element.style.setProperty('--progress', progress.toString());
    });
  }

  /**
   * Progress calculation config
   * First key: Where progress bar is placed (parent context)
   * Second key: What we're tracking (behavior)
   */
  private static readonly PROGRESS_CONFIG: Record<
    'form' | 'card' | 'set',
    Partial<
      Record<
        FormBehavior,
        {
          manager: 'cardManager' | 'setManager' | 'groupManager' | 'fieldManager';
          parentType: 'form' | 'card' | 'set';
          stateKey:
            | 'currentCardIndex'
            | 'currentSetIndex'
            | 'currentGroupIndex'
            | 'currentFieldIndex';
        }
      >
    >
  > = {
    form: {
      byCard: {
        manager: 'cardManager',
        parentType: 'form',
        stateKey: 'currentCardIndex',
      },
      bySet: {
        manager: 'setManager',
        parentType: 'form',
        stateKey: 'currentSetIndex',
      },
      byGroup: {
        manager: 'groupManager',
        parentType: 'form',
        stateKey: 'currentGroupIndex',
      },
      byField: {
        manager: 'fieldManager',
        parentType: 'form',
        stateKey: 'currentFieldIndex',
      },
    },
    card: {
      bySet: {
        manager: 'setManager',
        parentType: 'card',
        stateKey: 'currentSetIndex',
      },
      byGroup: {
        manager: 'groupManager',
        parentType: 'card',
        stateKey: 'currentGroupIndex',
      },
      byField: {
        manager: 'fieldManager',
        parentType: 'card',
        stateKey: 'currentFieldIndex',
      },
    },
    set: {
      byGroup: {
        manager: 'groupManager',
        parentType: 'set',
        stateKey: 'currentGroupIndex',
      },
      byField: {
        manager: 'fieldManager',
        parentType: 'set',
        stateKey: 'currentFieldIndex',
      },
    },
  };

  /**
   * Get progress for item based on its parent context and current behavior
   */
  private getProgressForBehavior(item: ProgressItem): number | undefined {
    const behavior = this.form.getBehavior();
    const { parentHierarchy } = item;

    // Determine progress bar's parent context (most specific first)
    const parentContext = this.getParentContext(parentHierarchy);
    if (!parentContext) return undefined;

    const [contextLevel, parentId] = parentContext;

    // Get config for this parent context + behavior combination
    const config = ProgressManager.PROGRESS_CONFIG[contextLevel]?.[behavior];
    if (!config) return undefined; // No valid combination

    const { manager, parentType, stateKey } = config;

    // Get siblings within the parent
    const managerInstance = this.form[manager];
    const siblings =
      parentType === 'form'
        ? managerInstance.getAll()
        : managerInstance.getAllByParentId(parentId, parentType);
    if (siblings.length === 0) return undefined;

    // Get current index
    const state = this.form.getAllState();
    const currentIndex = state[stateKey];

    // Find position
    const currentPosition = siblings.findIndex((s) => s.index === currentIndex);
    if (currentPosition === -1) return undefined;

    return ((currentPosition + 1) / siblings.length) * 100;
  }

  /**
   * Determine the parent context level for a progress item
   * Returns [contextLevel, parentId] or undefined
   * Checks from most specific (group) to least specific (form)
   */
  private getParentContext(
    hierarchy: ProgressParentHierarchy
  ): ['set' | 'card' | 'form', string] | undefined {
    // Check set (most specific)
    if ('setId' in hierarchy && hierarchy.setId) {
      return ['set', hierarchy.setId];
    }

    // Check card
    if ('cardId' in hierarchy && hierarchy.cardId) {
      return ['card', hierarchy.cardId];
    }

    // Check form (least specific)
    if (hierarchy.formId) {
      return ['form', hierarchy.formId];
    }

    return undefined;
  }
}
