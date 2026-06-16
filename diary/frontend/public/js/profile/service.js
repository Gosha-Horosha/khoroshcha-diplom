import { API_BASE } from '../config.js';

function getAuthHeaders() {
  const token = localStorage.getItem('access_token');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleJsonResponse(response, fallbackMessage) {
  if (response.status === 401) {
    throw new Error('Сессия истекла. Войдите снова.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || fallbackMessage || `Request failed (${response.status})`);
  }

  return response.json();
}

export async function fetchProfile() {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось загрузить профиль.');
}

export async function updateProfile(payload) {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  return handleJsonResponse(response, 'Не удалось сохранить профиль.');
}

export async function deleteAccount(password) {
  const response = await fetch(`${API_BASE}/auth/account`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password })
  });

  if (response.status === 401) {
    throw new Error('Сессия истекла. Войдите снова.');
  }
  if (response.status === 204) {
    return true;
  }
  const data = await response.json().catch(() => ({}));
  throw new Error(data.detail || 'Не удалось удалить аккаунт.');
}
