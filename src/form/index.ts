interface FormProps {
  element: HTMLElement;
}

export default class Form {
  private element: HTMLElement;
  private prefix = 'data-form';
  private elAttr = `${this.prefix}-element`;
  private cards: HTMLElement[] = [];

  constructor(props: FormProps) {
    this.element = props.element;
  }
}
