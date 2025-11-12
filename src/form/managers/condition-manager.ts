/**
 * Condition Manager
 *
 * Service for evaluating conditional visibility expressions.
 * Hierarchy managers call evaluateElementCondition() during buildItemData()
 * to determine isIncluded based on showif/hideif attributes.
 * Triggers rebuilds when field values change.
 */

import { ATTR } from '../constants/attr';
import type {
  ComparisonOperator,
  Condition,
  ConditionalElement,
  ConditionExpression,
  InputChangedEvent,
  LogicalOperator,
} from '../types';
import { parseElementAttribute } from '../utils';
import { BaseManager } from './base-manager';

/**
 * ConditionManager Implementation
 *
 * Service-oriented manager that provides condition evaluation for hierarchy managers.
 * Managers call evaluateElementCondition() during buildItemData() to determine isIncluded.
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

    this.logDebug('Initialized', {
      conditionalElements: this.conditionalElements.size,
      dependencies: Object.fromEntries(this.affectedElements),
    });
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
      throw this.createError('Cannot discover conditional elements: root element is null', 'init', {
        cause: rootElement,
      });
    }

    // Query all conditional elements
    const elements = this.form.queryAll<HTMLElement>(`[${ATTR}-showif], [${ATTR}-hideif]`);

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
  private registerCondition(element: HTMLElement): void {
    const showIfAttr = element.getAttribute(`${ATTR}-showif`);
    const hideIfAttr = element.getAttribute(`${ATTR}-hideif`);

    if (!showIfAttr && !hideIfAttr) return;

    const conditionalElement: ConditionalElement = {
      element,
      showIfExpression: showIfAttr ? this.parseExpression(showIfAttr) : undefined,
      hideIfExpression: hideIfAttr ? this.parseExpression(hideIfAttr) : undefined,
      dependsOn: new Set<string>(),
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
  private parseExpression(expression: string): ConditionExpression {
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
  // Public Evaluation API
  // ============================================

  /**
   * Evaluate condition for an element
   * Called by hierarchy managers during buildItemData()
   *
   * @param element - Element to evaluate
   * @returns Whether element should be included (visible)
   */
  public evaluateElementCondition(element: HTMLElement): boolean {
    const conditionalElement = this.conditionalElements.get(element);

    // If no conditions, element is always included
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

    // Element is included if showif is true AND hideif is false
    return showIfResult && !hideIfResult;
  }

  /**
   * Check if element has conditions
   *
   * @param element - Element to check
   * @returns Whether element has showif/hideif attributes
   */
  public hasConditions(element: HTMLElement): boolean {
    return this.conditionalElements.has(element);
  }

  // ============================================
  // Expression Evaluation
  // ============================================

  /**
   * Evaluate expression tree with logical operators
   *
   * @param expression - Parsed expression
   * @returns Evaluation result
   */
  private evaluateExpression(expression: ConditionExpression): boolean {
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
   * Get field value from input manager or form state
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
  // Event Listeners
  // ============================================

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to input changes
    this.form.subscribe('form:input:changed', (payload) => {
      this.onInputChange(payload);
    });

    this.logDebug('Event listeners setup');
  }

  /**
   * Handle field value change
   * Triggers rebuilds for affected hierarchy items
   * Defers rebuild to next tick to ensure input values are fresh
   *
   * @param payload - Input change payload
   */
  private onInputChange(payload: InputChangedEvent): void {
    const { name } = payload;

    // Get all elements affected by this field
    const affectedElements = this.affectedElements.get(name);
    if (!affectedElements || affectedElements.size === 0) return;

    this.logDebug(
      `Input "${name}" changed, scheduling rebuild for ${affectedElements.size} affected elements`
    );

    // Defer rebuild to next tick to ensure all input values are fresh
    // This allows the current event loop to complete, including any other
    // input change handlers that might update values
    // queueMicrotask(() => {
    this.logDebug(`Executing deferred rebuild for input "${name}"`);

    // Trigger rebuild for all hierarchy managers
    // This will cause buildItemData() to be called, which will re-evaluate conditions
    // The rebuild will update isIncluded flags for all affected items
    this.form.cardManager.rebuildAll();
    this.form.setManager.rebuildAll();
    this.form.groupManager.rebuildAll();
    this.form.fieldManager.rebuildAll();
    this.form.inputManager.rebuildAll();
    this.form.inputManager.applyStates();

    // Emit event for each affected element so DisplayManager can update visibility
    // This ensures immediate visibility changes without waiting for navigation
    affectedElements.forEach((element) => {
      const attrValue = element.getAttribute(`${ATTR}-element`);
      if (!attrValue) return;
      const parsed = parseElementAttribute(attrValue);
      if (!parsed) return;

      this.form.emit('form:condition:evaluated', {
        element,
        type: parsed.type as 'card' | 'set' | 'group' | 'field',
      });
    });
    // });
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
}
