import { API_BASE } from '../config.js';

const form = document.getElementById('signup-form');
const submitButton = form?.querySelector('button[type="submit"]');
const errorBox = document.getElementById('signup-error');
const googleSignupBtn = document.getElementById('google-signup-btn');
const signinLink = document.getElementById('signin-link');

const fields = {
  firstName: document.getElementById('first-name'),
  username: document.getElementById('username'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  confirmPassword: document.getElementById('confirm-password'),
  terms: document.getElementById('terms'),
  updates: document.getElementById('updates')
};

const errors = {
  firstName: document.getElementById('first-name-error'),
  username: document.getElementById('username-error'),
  email: document.getElementById('email-error'),
  password: document.getElementById('password-error'),
  confirmPassword: document.getElementById('confirm-password-error'),
  terms: document.getElementById('terms-error')
};

function showError(message) {
  if (!errorBox) {
    alert(message);
    return;
  }

  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  if (!errorBox) return;
  errorBox.textContent = '';
  errorBox.hidden = true;
}

function setLoading(isLoading) {
  if (!submitButton) return;
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'Creating account...' : 'Create account';
}

function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function setFieldError(input, errorElement, message) {
  if (!input || !errorElement) return;

  const wrap = input.closest('.input-wrap');
  errorElement.textContent = message || '';

  if (message) {
    input.setAttribute('aria-invalid', 'true');
    wrap?.classList.add('is-invalid');
    wrap?.classList.remove('is-valid');
  } else {
    input.removeAttribute('aria-invalid');
    wrap?.classList.remove('is-invalid');

    if (input.value.trim()) {
      wrap?.classList.add('is-valid');
    } else {
      wrap?.classList.remove('is-valid');
    }
  }
}

function setCheckboxError(input, errorElement, message) {
  if (!input || !errorElement) return;

  const label = input.closest('.checkbox');
  errorElement.textContent = message || '';

  if (message) {
    input.setAttribute('aria-invalid', 'true');
    label?.classList.add('is-invalid');
  } else {
    input.removeAttribute('aria-invalid');
    label?.classList.remove('is-invalid');
  }
}

function validateFirstName() {
  const value = fields.firstName?.value.trim() || '';

  if (!value) {
    setFieldError(fields.firstName, errors.firstName, 'Please enter your first name.');
    return false;
  }

  setFieldError(fields.firstName, errors.firstName, '');
  return true;
}

function validateUsername() {
  const rawValue = fields.username?.value.trim() || '';
  const normalized = normalizeUsername(rawValue);

  if (!rawValue) {
    setFieldError(fields.username, errors.username, 'Please choose a username.');
    return false;
  }

  if (normalized.length < 3) {
    setFieldError(fields.username, errors.username, 'Username must contain at least 3 characters.');
    return false;
  }

  setFieldError(fields.username, errors.username, '');
  return true;
}

function validateEmail() {
  const value = fields.email?.value.trim() || '';

  if (!value) {
    setFieldError(fields.email, errors.email, 'Please enter your email address.');
    return false;
  }

  if (!value.includes('@')) {
    setFieldError(fields.email, errors.email, 'Email must include @.');
    return false;
  }

  if (!fields.email.checkValidity()) {
    setFieldError(fields.email, errors.email, 'Please enter a valid email address.');
    return false;
  }

  setFieldError(fields.email, errors.email, '');
  return true;
}

function validatePassword() {
  const value = fields.password?.value || '';

  if (!value.trim()) {
    setFieldError(fields.password, errors.password, 'Please create a password.');
    return false;
  }

  if (value.length < 8) {
    setFieldError(fields.password, errors.password, 'Password must be at least 8 characters long.');
    return false;
  }

  setFieldError(fields.password, errors.password, '');
  return true;
}

function validateConfirmPassword() {
  const password = fields.password?.value || '';
  const confirmPassword = fields.confirmPassword?.value || '';

  if (!confirmPassword.trim()) {
    setFieldError(fields.confirmPassword, errors.confirmPassword, 'Please repeat your password.');
    return false;
  }

  if (password !== confirmPassword) {
    setFieldError(fields.confirmPassword, errors.confirmPassword, 'Passwords do not match. Please try again.');
    return false;
  }

  setFieldError(fields.confirmPassword, errors.confirmPassword, '');
  return true;
}

function validateTerms() {
  if (!fields.terms?.checked) {
    setCheckboxError(fields.terms, errors.terms, 'You need to accept the terms to continue.');
    return false;
  }

  setCheckboxError(fields.terms, errors.terms, '');
  return true;
}

function validateForm() {
  clearError();

  const results = [
    validateFirstName(),
    validateUsername(),
    validateEmail(),
    validatePassword(),
    validateConfirmPassword(),
    validateTerms()
  ];

  return results.every(Boolean);
}

async function handleSignup(event) {
  event.preventDefault();

  const isValid = validateForm();

  if (!isValid) {
    const firstInvalid = form?.querySelector('[aria-invalid="true"]');
    firstInvalid?.focus();
    return;
  }

  setLoading(true);

  const firstName = fields.firstName.value.trim();
  const username = normalizeUsername(fields.username.value);
  const email = fields.email.value.trim();
  const password = fields.password.value;
  const updates = fields.updates?.checked ?? false;

  const payload = {
    first_name: firstName,
    username,
    email,
    password,
    updates_opt_in: updates
  };

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || 'Не удалось создать аккаунт.');
    }

    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('token_type', data.token_type || 'bearer');
      localStorage.setItem('auth_email', email);
      window.location.href = './dashboard.html';
      return;
    }

    // Почту нужно подтвердить — ведём на страницу с инструкцией.
    window.location.href = `./verify-email.html?sent=1&email=${encodeURIComponent(email)}`;
  } catch (error) {
    console.error('Signup error:', error);
    showError(error.message || 'Ошибка соединения с сервером.');
  } finally {
    setLoading(false);
  }
}

if (fields.firstName) {
  fields.firstName.addEventListener('blur', validateFirstName);
  fields.firstName.addEventListener('input', () => {
    if (errors.firstName?.textContent) validateFirstName();
  });
}

if (fields.username) {
  fields.username.addEventListener('blur', validateUsername);
  fields.username.addEventListener('input', () => {
    if (errors.username?.textContent) validateUsername();
  });
}

if (fields.email) {
  fields.email.addEventListener('blur', validateEmail);
  fields.email.addEventListener('input', () => {
    if (errors.email?.textContent) validateEmail();
  });
}

if (fields.password) {
  fields.password.addEventListener('blur', validatePassword);
  fields.password.addEventListener('input', () => {
    if (errors.password?.textContent) validatePassword();
    if (fields.confirmPassword?.value) validateConfirmPassword();
  });
}

if (fields.confirmPassword) {
  fields.confirmPassword.addEventListener('blur', validateConfirmPassword);
  fields.confirmPassword.addEventListener('input', () => {
    if (errors.confirmPassword?.textContent) validateConfirmPassword();
  });
}

if (fields.terms) {
  fields.terms.addEventListener('change', validateTerms);
}

if (form) {
  form.addEventListener('submit', handleSignup);
}

if (googleSignupBtn) {
  googleSignupBtn.addEventListener('click', () => {
    showError('Регистрация через Google пока не реализована.');
  });
}

if (signinLink) {
  signinLink.addEventListener('click', () => {
    clearError();
  });
}