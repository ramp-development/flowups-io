/**
 * Condition Manager
 *
 * Handles conditional visibility with performance optimization.
 * Discovers showif/hideif elements, parses condition expressions,
 * builds dependency graph, and evaluates conditions efficiently.
 */

import { ATTR } from '../constants/attr';
import type { InputItem } from '../types';
import { BaseManager } from './base-manager';

/**
 * Supported comparison operators
 */
type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | '*=' | '^=' | '$=';

/**
 * Logical operators
 */
type LogicalOperator = '&&' | '||';

/**
 * Parsed condition expression
 */
interface Condition {
  field: string;
  operator: ComparisonOperator;
  value: string;
}

/**
 * Parsed expression tree (supports logical operators)
 */
interface Expression {
  conditions: Condition[];
  logicalOperators: LogicalOperator[];
}

/**
 * Conditional element data
 */
interface ConditionalElement {
  element: HTMLElement;
  showIfExpression?: Expression;
  hideIfExpression?: Expression;
  dependsOn: Set<string>; // Field names this element depends on
  lastResult: boolean; // Cached evaluation result
}

/**
 * ConditionManager Implementation
 *
 * Discovers conditional elements, parses expressions, evaluates conditions,
 * and updates visibility efficiently using dependency graph.
 */
export class ConditionManager extends BaseManager {
  /** All conditional elements indexed by element */
  private conditionalElements: Map<HTMLElement, ConditionalElement> = new Map();

  /** Dependency graph: field name -> Set of elements that depend on it */
  private affectedElements: Map<string, Set<HTMLElement>> = new Map();

  /**
   * Initialize ConditionManager
   */
  public init(): void {
    this.groupStart('Initializing Conditions');
    this.discoverConditionalElements();
    this.setupEventListeners();
    this.evaluateAllConditions(true); // Initial evaluation

    this.logDebug('Initialized');
    this.groupEnd();
  }

  /**
   * Cleanup manager resources
   */
  public destroy(): void {
    this.conditionalElements.clear();
    this.affectedElements.clear();
    this.logDebug('ConditionManager destroyed');
  }

  // ============================================
  // Discovery
  // ============================================

  /**
   * Discover all conditional elements in the form
   * Finds elements with [data-form-showif] or [data-form-hideif]
   */
  private discoverConditionalElements(): void {
    const rootElement = this.form.getRootElement();
    if (!rootElement) {
      throw this.createError(
        'Cannot discover conditional elements: root element is null',
        'init',
        { cause: rootElement }
      );
    }

    // Query all conditional elements
    const elements = this.form.queryAll<HTMLElement>(
      `[${ATTR}-showif], [${ATTR}-hideif]`
    );

    this.conditionalElements.clear();
    this.affectedElements.clear();

    elements.forEach((element) => {
      this.registerCondition(element);
    });

    this.logDebug(`Discovered ${this.conditionalElements.size} conditional elements`, {
      elements: Array.from(this.conditionalElements.values()),
      dependencyGraph: Object.fromEntries(this.affectedElements),
    });
  }

  /**
   * Register a conditional element
   * Parses expressions and builds dependency graph
   *
   * @param element - HTMLElement with showif/hideif attributes
   */
  public registerCondition(element: HTMLElement): void {
    const showIfAttr = element.getAttribute(`${ATTR}-showif`);
    const hideIfAttr = element.getAttribute(`${ATTR}-hideif`);

    if (!showIfAttr && !hideIfAttr) return;

    const conditionalElement: ConditionalElement = {
      element,
      showIfExpression: showIfAttr ? this.parseExpression(showIfAttr) : undefined,
      hideIfExpression: hideIfAttr ? this.parseExpression(hideIfAttr) : undefined,
      dependsOn: new Set<string>(),
      lastResult: true, // Default to visible
    };

    // Extract all field dependencies
    if (conditionalElement.showIfExpression) {
      conditionalElement.showIfExpression.conditions.forEach((condition) => {
        conditionalElement.dependsOn.add(condition.field);
        this.addToDependencyGraph(condition.field, element);
      });
    }

    if (conditionalElement.hideIfExpression) {
      conditionalElement.hideIfExpression.conditions.forEach((condition) => {
        conditionalElement.dependsOn.add(condition.field);
        this.addToDependencyGraph(condition.field, element);
      });
    }

    this.conditionalElements.set(element, conditionalElement);
  }

  /**
   * Add element to dependency graph
   *
   * @param fieldName - Field name that affects visibility
   * @param element - Element that depends on the field
   */
  private addToDependencyGraph(fieldName: string, element: HTMLElement): void {
    if (!this.affectedElements.has(fieldName)) {
      this.affectedElements.set(fieldName, new Set());
    }
    this.affectedElements.get(fieldName)!.add(element);
  }

  // ============================================
  // Expression Parsing
  // ============================================

  /**
   * Parse condition expression
   * Supports: {fieldName} operator value && {fieldName2} operator2 value2
   *
   * @param expression - Raw expression string
   * @returns Parsed expression tree
   */
  private parseExpression(expression: string): Expression {
    const conditions: Condition[] = [];
    const logicalOperators: LogicalOperator[] = [];

    // Split by logical operators while preserving them
    const parts = expression.split(/(\s*(?:&&|\|\|)\s*)/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      // Check if this part is a logical operator
      if (part === '&&' || part === '||') {
        logicalOperators.push(part);
        continue;
      }

      // Parse condition
      const condition = this.parseCondition(part);
      if (condition) {
        conditions.push(condition);
      }
    }

    return { conditions, logicalOperators };
  }

  /**
   * Parse single condition: {fieldName} operator value
   *
   * @param conditionStr - Single condition string
   * @returns Parsed condition or undefined
   */
  private parseCondition(conditionStr: string): Condition | undefined {
    // Extract field name from {}
    const fieldMatch = conditionStr.match(/\{([^}]+)\}/);
    if (!fieldMatch) {
      this.logWarn(`Invalid condition syntax: ${conditionStr}`);
      return undefined;
    }

    const field = fieldMatch[1].trim();

    // Remove field part to parse operator and value
    const remainder = conditionStr.substring(fieldMatch.index! + fieldMatch[0].length).trim();

    // Match operator (support multi-character operators like >=, <=, *=, ^=, $=)
    const operatorMatch = remainder.match(/^(>=|<=|\*=|\^=|\$=|!=|=|>|<)/);
    if (!operatorMatch) {
      this.logWarn(`Invalid operator in condition: ${conditionStr}`);
      return undefined;
    }

    const operator = operatorMatch[1] as ComparisonOperator;

    // Extract value (everything after operator, trimmed)
    const value = remainder.substring(operator.length).trim();

    return { field, operator, value };
  }

  // ============================================
  // Condition Evaluation
  // ============================================

  /**
   * Evaluate all conditions
   * Used during initial load
   *
   * @param isInitial - Whether this is the initial evaluation
   */
  private evaluateAllConditions(isInitial: boolean = false): void {
    this.logDebug(`${isInitial ? 'Initial' : 'Re-evaluating'} all conditions`);

    this.conditionalElements.forEach((conditionalElement) => {
      const isVisible = this.evaluateCondition(conditionalElement.element);
      this.toggleElement(conditionalElement.element, isVisible, isInitial);
      conditionalElement.lastResult = isVisible;
    });
  }

  /**
   * Evaluate condition for a specific element
   *
   * @param element - Element to evaluate
   * @returns Whether element should be visible
   */
  public evaluateCondition(element: HTMLElement): boolean {
    const conditionalElement = this.conditionalElements.get(element);
    if (!conditionalElement) return true;

    let showIfResult = true;
    let hideIfResult = false;

    // Evaluate showif expression
    if (conditionalElement.showIfExpression) {
      showIfResult = this.evaluateExpression(conditionalElement.showIfExpression);
    }

    // Evaluate hideif expression
    if (conditionalElement.hideIfExpression) {
      hideIfResult = this.evaluateExpression(conditionalElement.hideIfExpression);
    }

    // Element is visible if showif is true AND hideif is false
    return showIfResult && !hideIfResult;
  }

  /**
   * Evaluate expression tree with logical operators
   *
   * @param expression - Parsed expression
   * @returns Evaluation result
   */
  private evaluateExpression(expression: Expression): boolean {
    const { conditions, logicalOperators } = expression;

    if (conditions.length === 0) return true;
    if (conditions.length === 1) {
      return this.evaluateConditionPart(conditions[0]);
    }

    // Evaluate first condition
    let result = this.evaluateConditionPart(conditions[0]);

    // Apply logical operators
    for (let i = 0; i < logicalOperators.length; i++) {
      const operator = logicalOperators[i];
      const nextCondition = conditions[i + 1];

      if (!nextCondition) break;

      const nextResult = this.evaluateConditionPart(nextCondition);

      if (operator === '&&') {
        result = result && nextResult;
      } else if (operator === '||') {
        result = result || nextResult;
      }
    }

    return result;
  }

  /**
   * Evaluate single condition part
   *
   * @param condition - Parsed condition
   * @returns Evaluation result
   */
  private evaluateConditionPart(condition: Condition): boolean {
    const { field, operator, value } = condition;

    // Get current value from form data
    const currentValue = this.getFieldValue(field);

    // Convert to string for comparison
    const currentValueStr = String(currentValue ?? '').toLowerCase();
    const expectedValueStr = value.toLowerCase();

    // Evaluate based on operator
    switch (operator) {
      case '=':
        return currentValueStr === expectedValueStr;
      case '!=':
        return currentValueStr !== expectedValueStr;
      case '>':
        return parseFloat(currentValueStr) > parseFloat(expectedValueStr);
      case '<':
        return parseFloat(currentValueStr) < parseFloat(expectedValueStr);
      case '>=':
        return parseFloat(currentValueStr) >= parseFloat(expectedValueStr);
      case '<=':
        return parseFloat(currentValueStr) <= parseFloat(expectedValueStr);
      case '*=': // Contains
        return currentValueStr.includes(expectedValueStr);
      case '^=': // Starts with
        return currentValueStr.startsWith(expectedValueStr);
      case '$=': // Ends with
        return currentValueStr.endsWith(expectedValueStr);
      default:
        this.logWarn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get field value from input manager
   *
   * @param fieldName - Name of the field/input
   * @returns Current value
   */
  private getFieldValue(fieldName: string): unknown {
    // Try to get input by name (id)
    const input = this.form.inputManager.getById(fieldName);
    if (input) {
      return input.value;
    }

    // If not found, check if it's a form state variable (form.*)
    if (fieldName.startsWith('form.')) {
      const stateKey = fieldName.substring(5);
      const state = this.form.getAllState();
      return state[stateKey as keyof typeof state];
    }

    this.logWarn(`Field not found: ${fieldName}`);
    return undefined;
  }

  // ============================================
  // Element Visibility Toggle
  // ============================================

  /**
   * Toggle element visibility
   *
   * @param element - Element to toggle
   * @param isVisible - Whether element should be visible
   * @param isInitial - Whether this is the initial toggle (skip transitions)
   */
  private toggleElement(element: HTMLElement, isVisible: boolean, isInitial: boolean = false): void {
    if (isVisible) {
      element.style.removeProperty('display');
      if (!isInitial) {
        // Optionally add transition class
        element.classList.add('is-visible');
      }
    } else {
      element.style.display = 'none';
      if (!isInitial) {
        element.classList.remove('is-visible');
      }
    }

    // Update input required states for inputs within this element
    this.updateInputRequiredStates(element, isVisible);
  }

  /**
   * Update required state for inputs within an element
   * When an element is hidden, its inputs should not be required
   *
   * @param element - Parent element
   * @param isVisible - Whether element is visible
   */
  private updateInputRequiredStates(element: HTMLElement, isVisible: boolean): void {
    const inputs = element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );

    inputs.forEach((input) => {
      const name = input.getAttribute('name');
      if (!name) return;

      const inputItem = this.form.inputManager.getById(name);
      if (!inputItem) return;

      // Update isIncluded state based on visibility
      const wasIncluded = inputItem.isIncluded;
      const nowIncluded = isVisible;

      if (wasIncluded !== nowIncluded) {
        // Update isIncluded and isRequired directly on the item
        inputItem.isIncluded = nowIncluded;
        inputItem.isRequired = nowIncluded ? inputItem.isRequiredOriginal : false;

        this.logDebug(`Updated input "${name}" required state`, {
          isIncluded: nowIncluded,
          isRequired: inputItem.isRequired,
        });
      }
    });

    // If visibility changed, trigger navigation rebuild
    if (inputs.length > 0) {
      this.form.emit('form:navigation:request', { type: 'next' }); // Triggers rebuild
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to input changes
    this.form.subscribe('form:input:changed', (payload) => {
      this.onFieldChange(payload);
    });

    this.logDebug('Event listeners setup');
  }

  /**
   * Handle field value change
   * Only re-evaluates elements affected by the changed field
   *
   * @param payload - Input change payload
   */
  private onFieldChange(payload: { name: string; value: unknown }): void {
    const { name: fieldName } = payload;

    // Get all elements affected by this field
    const affectedElements = this.affectedElements.get(fieldName);
    if (!affectedElements || affectedElements.size === 0) return;

    this.logDebug(`Field "${fieldName}" changed, evaluating ${affectedElements.size} affected elements`);

    affectedElements.forEach((element) => {
      const conditionalElement = this.conditionalElements.get(element);
      if (!conditionalElement) return;

      const isVisible = this.evaluateCondition(element);
      const wasVisible = conditionalElement.lastResult;

      // Only update if visibility changed
      if (isVisible !== wasVisible) {
        this.toggleElement(element, isVisible);
        conditionalElement.lastResult = isVisible;

        this.logDebug(`Toggled element visibility`, {
          element: element.getAttribute(`${ATTR}-element`),
          isVisible,
          wasVisible,
          fieldName,
        });
      }
    });
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get all elements affected by a field
   *
   * @param fieldName - Field name
   * @returns Set of affected elements
   */
  public getAffectedElements(fieldName: string): Set<HTMLElement> {
    return this.affectedElements.get(fieldName) || new Set();
  }

  /**
   * Clear condition cache
   * Useful for forcing re-evaluation
   */
  public clearCache(): void {
    this.conditionalElements.forEach((conditionalElement) => {
      conditionalElement.lastResult = true;
    });
    this.logDebug('Condition cache cleared');
  }

  /**
   * Re-evaluate all conditions
   * Public method to manually trigger evaluation
   */
  public evaluateConditions(): void {
    this.evaluateAllConditions();
  }
}
