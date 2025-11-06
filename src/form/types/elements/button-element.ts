/**
 * Navigation Button Element
 */
export interface ButtonElement {
  /** The button container DOM element */
  container: HTMLElement;

  /** The button DOM element */
  button: HTMLButtonElement;

  /** Button type */
  type: 'prev' | 'next' | 'submit';

  /** Whether button is currently disabled */
  disabled: boolean;
}
