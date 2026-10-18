document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-local-form]').forEach(form => {
    form.querySelectorAll('.wpcf7-validates-as-required').forEach(input => { input.required = true; });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!form.reportValidity()) return;
      const button = form.querySelector('[type="submit"]');
      let output = form.querySelector('.wpcf7-response-output');
      if (!output) { output = document.createElement('p'); form.append(output); }
      output.classList.add('wpcf7-response-output');
      output.setAttribute('role', 'status');
      output.setAttribute('aria-live', 'polite');
      if (button) button.disabled = true;
      try {
        const fields = {};
        for (const [key, value] of new FormData(form)) {
          if (key.startsWith('_') || key === 'g-recaptcha-response') continue;
          if (value instanceof File) { if (value.size) throw new Error('File uploads need a business-specific backend. Please use the contact email.'); continue; }
          if (Object.hasOwn(fields, key)) fields[key] = [].concat(fields[key], value);
          else fields[key] = value;
        }
        const response = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ page:location.pathname, fields }) });
        if (!response.ok) throw new Error('Could not save your inquiry. Please try again.');
        output.dataset.localResult = 'success';
        output.textContent = 'Your inquiry has been saved in this local preview. Email delivery will be connected when the business details are configured.';
        form.reset();
      } catch (error) { output.dataset.localResult = 'error'; output.textContent = error.message; }
      finally { if (button) button.disabled = false; }
    }, true);
  });
  // The original theme normally releases this class on window load.
  window.addEventListener('load', () => document.body.classList.remove('loading-effect'), {once:true});
});
