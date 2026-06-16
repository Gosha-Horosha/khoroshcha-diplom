import { API_BASE } from '../config.js';

function redirectToLogin() {
  window.location.href = '/login.html';
}

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token_type');
  localStorage.removeItem('auth_email');
  localStorage.removeItem('remember_login');
}

export function getAccessToken() {
  return localStorage.getItem('access_token');
}

export function logout() {
  clearAuth();
  redirectToLogin();
}

export async function requireAuth() {
  const token = getAccessToken();

  if (!token) {
    redirectToLogin();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    if (response.status === 401) {
      clearAuth();
      redirectToLogin();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Auth check failed (${response.status})`);
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('requireAuth error:', error);
    clearAuth();
    redirectToLogin();
    return null;
  }
}