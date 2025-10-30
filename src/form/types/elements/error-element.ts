/**
 * Error Container Element
 */
export interface ErrorElement {
  /** The error container DOM element */
  element: HTMLElement;

  /** Field name this error is for */
  fieldName: string;

  /** Whether error is currently visible */
  visible: boolean;
}
