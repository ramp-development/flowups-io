/**
 * Supported comparison operators
 */
export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | '*=' | '^=' | '$=';

/**
 * Logical operators
 */
export type LogicalOperator = '&&' | '||';

/**
 * Parsed condition expression
 */
export interface Condition {
  field: string;
  operator: ComparisonOperator;
  value: string;
}

/**
 * Parsed expression tree (supports logical operators)
 */
export interface ConditionExpression {
  conditions: Condition[];
  logicalOperators: LogicalOperator[];
}

/**
 * Conditional element data
 */
export interface ConditionalElement {
  element: HTMLElement;
  showIfExpression?: ConditionExpression;
  hideIfExpression?: ConditionExpression;
  dependsOn: Set<string>; // Field names this element depends on
}
