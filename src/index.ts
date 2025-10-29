import MultiStepForm from './form';

window.Webflow ||= [];
window.Webflow.push(() => {
  const form = document.querySelector('form[data-form-element="form"]');
  if (!form || !(form instanceof HTMLElement)) return;

  new MultiStepForm({ element: form });
});
