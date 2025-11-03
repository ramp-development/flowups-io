import { FlowupsForm } from './form';
import { FORM_INTIAL_STATE } from './form/form-intial-state';

window.Webflow ||= [];
window.Webflow.push(() => {
  const form = document.querySelector('form[data-form-element="form"]');
  if (!form || !(form instanceof HTMLFormElement)) return;

  const name = form.getAttribute('name') ?? 'untitled-form';

  new FlowupsForm({
    group: 'FORM',
    id: name,
    debug: true,
    autoInit: false,
    selector: form,
    state: FORM_INTIAL_STATE,
  });
});
