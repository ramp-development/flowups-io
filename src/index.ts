import { FlowupsForm } from './form';
import { ATTR } from './form/constants';

interface MotifFormAPI {
  id: string;
  getAllState: () => Record<string, unknown>;
  getBehavior: () => ReturnType<FlowupsForm['getBehavior']>;
  getFormConfig: () => ReturnType<FlowupsForm['getFormConfig']>;
  getFormData: () => Record<string, unknown>;
  setLoading: (isLoading: boolean) => void;
  showSuccess: () => void;
  showError: (message: string, timeout?: number) => void;
  onSubmit: (callback: (formData: Record<string, unknown>) => void) => void;
  onMount: (callback: () => void) => void;
  onUnmount: (callback: () => void) => void;
}

declare global {
  interface Window {
    MotifForm: MotifFormAPI | Array<() => void>;
  }
}

// Preserve any queued callbacks from early initialization
const initQueue = (window.MotifForm as Array<() => void>) || [];

window.Webflow ||= [];
window.Webflow.push(() => {
  const form = document.querySelector(`form[${ATTR}-element="form"]`);
  if (!form || !(form instanceof HTMLFormElement)) return;

  const name = form.getAttribute('name') ?? 'untitled-form';

  const flowupsForm = new FlowupsForm({ selector: form });

  // Replace with actual implementation
  window.MotifForm = {
    id: flowupsForm.getFormName(),
    getAllState: () => {
      return flowupsForm.getAllState();
    },
    getBehavior: () => {
      return flowupsForm.getBehavior();
    },
    getFormConfig: () => {
      return flowupsForm.getFormConfig();
    },
    getFormData: () => {
      return flowupsForm.getState('formData');
    },
    setLoading: (isLoading: boolean) => {
      flowupsForm.submitManager.setLoading(isLoading);
    },
    showSuccess: () => {
      flowupsForm.submitManager.showSuccess();
    },
    showError: (message: string, timeout?: number) => {
      flowupsForm.submitManager.showError(message, timeout);
    },
    onSubmit: (callback: (formData: Record<string, unknown>) => void) => {
      flowupsForm.subscribe('form:submit:started', () => {
        const formData = flowupsForm.getState('formData');
        callback(formData);
      });
    },
    onMount: (callback: () => void) => {
      flowupsForm.subscribe('form:initialized', ({ formId }) => {
        if (formId !== name) return;
        callback();
      });
    },
    onUnmount: (callback: () => void) => {
      flowupsForm.subscribe('form:destroyed', ({ formId }) => {
        if (formId !== name) return;
        callback();
      });
    },
  };

  // Process any queued initialization callbacks
  initQueue.forEach((cb) => cb());
});
