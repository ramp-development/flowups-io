import { FlowupsForm } from './form';
import { ATTR } from './form/constants';

window.Webflow ||= [];
window.Webflow.push(() => {
  const form = document.querySelector(`form[${ATTR}-element="form"]`);
  if (!form || !(form instanceof HTMLFormElement)) return;

  const name = form.getAttribute('name') ?? 'untitled-form';

  new FlowupsForm({
    group: 'FORM',
    id: name,
    debug: true,
    autoInit: false,
    selector: form,
  });
});
