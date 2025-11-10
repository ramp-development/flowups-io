import type { FlowupsForm } from '../..';
import type { ItemData } from '../../types';

/**
 * Hierarchy Builder Utility
 *
 * Shared hierarchy building utilities for all managers.
 * Static methods - no instantiation needed.
 *
 * Extracted from ItemManager to be reusable by ButtonManager and other managers.
 */
export class HierarchyBuilder {
  /**
   * Build hierarchy object from parent item
   * Recursively walks up parent chain
   *
   * This is the core method used by ItemManager.findParentHierarchy() to create
   * hierarchy objects by recursively merging parent hierarchies:
   *
   * - CardParentHierarchy: { formId }
   * - SetParentHierarchy: { ..., cardId, cardIndex }
   * - GroupParentHierarchy: { ..., setId, setIndex }
   * - FieldParentHierarchy: { ..., groupId, groupIndex }
   * - InputParentHierarchy: { ..., fieldId, fieldIndex }
   * - ButtonParentHierarchy: CardParentHierarchy | SetParentHierarchy | GroupParentHierarchy
   *
   * @param parent - Parent item or null
   * @param formId - Form ID (required for all hierarchies)
   * @returns Hierarchy object with parent IDs and indices
   *
   * @example
   * // Building a FieldParentHierarchy from a group parent
   * const groupItem = { id: 'group-1', index: 0, type: 'group', parentHierarchy: { formId: 'form', cardId: 'card-1', cardIndex: 0, setId: 'set-1', setIndex: 0 } };
   * const hierarchy = HierarchyBuilder.buildFromParent(groupItem, 'form');
   * // Returns: { formId: 'form', cardId: 'card-1', cardIndex: 0, setId: 'set-1', setIndex: 0, groupId: 'group-1', groupIndex: 0 }
   */
  static buildFromParent(parent: ItemData | null, formId: string): Record<string, unknown> {
    const hierarchy: Record<string, unknown> = {
      formId,
    };

    if (!parent) return hierarchy;

    // Add this parent's info
    hierarchy[`${parent.type}Id`] = parent.id;
    hierarchy[`${parent.type}Index`] = parent.index;

    // If parent has hierarchy, merge it (walks up the chain)
    if ('parentHierarchy' in parent && parent.parentHierarchy) {
      Object.assign(hierarchy, parent.parentHierarchy);
    }

    return hierarchy;
  }

  /**
   * Find parent hierarchy for an element by walking up the DOM tree
   *
   * This method discovers all parent items (field, group, set, card) by:
   * 1. Finding the immediate parent using findParentItem callback
   * 2. Recursively building the full hierarchy using buildFromParent
   *
   * Used by ItemManager during item discovery to establish parent relationships.
   *
   * @param child - HTMLElement or ItemData to find parents for
   * @param form - Form instance for accessing managers
   * @param findParentItem - Callback to find immediate parent (manager-specific)
   * @returns Complete hierarchy object
   *
   * @example
   * // In FieldManager.findParentHierarchy()
   * const hierarchy = HierarchyBuilder.findParentHierarchy<FieldParentHierarchy>(
   *   fieldElement,
   *   this.form,
   *   (el) => this.findParentByElement(el, 'group', () => this.form.groupManager.getAll())
   * );
   * // Returns: { formId, cardId, cardIndex, setId, setIndex, groupId, groupIndex }
   */
  static findParentHierarchy<THierarchy>(
    child: HTMLElement | ItemData,
    form: FlowupsForm,
    findParentItem: (element: HTMLElement) => ItemData | null
  ): THierarchy {
    let parentItem: ItemData | null;

    // If already an ItemData object, use it directly
    if (child instanceof HTMLElement) {
      // Find immediate parent using manager-specific logic
      parentItem = findParentItem(child);
    } else {
      parentItem = child;
    }

    // Build complete hierarchy by walking up parent chain
    return HierarchyBuilder.buildFromParent(parentItem, form.getId()) as THierarchy;
  }
}
