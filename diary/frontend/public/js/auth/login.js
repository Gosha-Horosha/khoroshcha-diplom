import { API_BASE } from '../config.js';

const form = document.querySelector('.auth-form');
const googleBtn = document.getElementById('google-btn');
const appleBtn = document.getElementById('apple-btn');
const createAccountLink = document.getElementById('create-account-link');
//const forgotLink = document.getElementById('forgot-link');
const submitButton = form?.querySelector('button[type="submit"]');
const errorBox = document.getElementById('login-error');

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
  submitButton.textContent = isLoading ? 'Signing in...' : 'Enter Night Archive';
}

async function handleLogin(event) {
  event.preventDefault();
  clearError();

  const email = form?.email?.value?.trim() || '';
  const password = form?.password?.value || '';
  const remember = form?.remember?.checked ?? true;

  if (!email || !password) {
    showError('Пожалуйста, введите email и пароль.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.detail || 'Неверный email или пароль.';
      throw new Error(message);
    }

    if (!data.access_token) {
      throw new Error('Сервер не вернул access token.');
    }

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('token_type', data.token_type || 'bearer');
    localStorage.setItem('auth_email', email);

    if (remember) {
      localStorage.setItem('remember_login', 'true');
    } else {
      localStorage.removeItem('remember_login');
    }

    window.location.href = '/dashboard.html';
  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Ошибка соединения с сервером.');
  } finally {
    setLoading(false);
  }
}

if (form) {
  form.addEventListener('submit', handleLogin);
}

//if (forgotLink) {
//  forgotLink.addEventListener('click', (event) => {
//    event.preventDefault();
//    showError('Восстановление пароля пока не реализовано.');
//  });
//}

if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    showError('OAuth через Google пока не реализован.');
  });
}

if (appleBtn) {
  appleBtn.addEventListener('click', () => {
    showError('Авторизация через Apple пока не реализована.');
  });
}

if (createAccountLink) {
  createAccountLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = '/signup.html';
  });
}