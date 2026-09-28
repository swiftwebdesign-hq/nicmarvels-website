(() => {
  // Mobile menu toggle (new — purely presentational, no effect on submission/API logic)
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const form = document.getElementById('enrollmentForm');
  if (!form) return;
  const message = document.getElementById('formMessage');
  const maxBytes = 2 * 1024 * 1024;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

  document.querySelectorAll('input[type="file"][data-upload-label]').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      const target = document.getElementById(input.dataset.uploadLabel);
      if (!target) return;
      if (!file) {
        target.textContent = 'No file chosen';
        return;
      }
      if (!allowedTypes.has(file.type) || file.size > maxBytes) {
        input.value = '';
        target.textContent = 'No file chosen';
        message.className = 'form-message';
        message.textContent = file.size > maxBytes
          ? 'Please choose an image smaller than 2 MB.'
          : 'Please choose a JPG, PNG or WEBP image.';
        input.focus();
        return;
      }
      message.textContent = '';
      target.textContent = file.name;
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.className = 'form-message';
    message.textContent = '';

    if (form.elements.website.value) return;
    if (!form.reportValidity()) {
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus({ preventScroll: true });
      return;
    }

    const apiBase = String(window.NIKSMARVEL_CONFIG?.apiBase || '').replace(/\/$/, '');
    const endpoint = `${apiBase}/api/submissions`;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending application…';

    try {
      const response = await fetch(endpoint, { method: 'POST', body: new FormData(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || (response.status === 503
          ? 'Applications are not connected yet. Please contact the academy before submitting.'
          : 'Your application could not be sent. Please try again or contact the academy.'));
      }
      form.reset();
      document.getElementById('passportName').textContent = 'No file chosen';
      document.getElementById('signatureName').textContent = 'No file chosen';
      message.className = 'form-message success';
      message.textContent = 'Thank you. Your application has been received by the academy.';
      message.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      message.textContent = error instanceof Error
        ? error.message
        : 'Your application could not be sent. Please try again or contact the academy.';
    } finally {
      button.disabled = false;
      button.textContent = 'Submit Form';
    }
  });
})();
