import { MultiStepForm } from './form';

window.Webflow ||= [];
window.Webflow.push(() => {
  const form = document.querySelector('form[data-form-element="form"]');
  if (!form || !(form instanceof HTMLFormElement)) return;

  new MultiStepForm({ element: form });
});
