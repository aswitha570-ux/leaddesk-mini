const form = document.getElementById('leadForm');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

function clearErrors() {
  ['name', 'email', 'budget', 'message'].forEach(field => {
    document.getElementById(`err-${field}`).textContent = '';
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  formStatus.textContent = '';
  formStatus.className = 'form-status';

  const data = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    budget: document.getElementById('budget').value,
    message: document.getElementById('message').value.trim()
  };

  // client-side validation
  let hasError = false;
  if (!data.name) { document.getElementById('err-name').textContent = 'Name is required.'; hasError = true; }
  if (!data.email || !isValidEmail(data.email)) { document.getElementById('err-email').textContent = 'Enter a valid email.'; hasError = true; }
  if (!data.budget) { document.getElementById('err-budget').textContent = 'Please pick a budget range.'; hasError = true; }
  if (!data.message) { document.getElementById('err-message').textContent = 'Please tell us about your project.'; hasError = true; }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!res.ok) {
      formStatus.textContent = result.error || 'Something went wrong. Please try again.';
      formStatus.className = 'form-status error';
    } else {
      formStatus.textContent = 'Thanks! We\'ll be in touch within 24 hours.';
      formStatus.className = 'form-status success';
      form.reset();
    }
  } catch (err) {
    formStatus.textContent = 'Network error. Please try again.';
    formStatus.className = 'form-status error';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Request';
  }
});
