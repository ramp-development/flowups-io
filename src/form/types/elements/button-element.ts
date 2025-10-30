/**
 * Navigation Button Element
 */
export interface ButtonElement {
  /** The button DOM element */
  element: HTMLButtonElement;

  /** Button type */
  type: 'prev' | 'next' | 'submit';

  /** Whether button is currently enabled */
  enabled: boolean;
}
