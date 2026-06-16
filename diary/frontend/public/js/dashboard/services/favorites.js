import { API_BASE } from '../../config.js';

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

  if (response.status === 204) {
    return true;
  }

  return response.json();
}

export async function fetchFavorites() {
  const response = await fetch(`${API_BASE}/diary/favorites`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await handleJsonResponse(response, 'Не удалось загрузить избранное.');
  return Array.isArray(data) ? data : (data.items || []);
}

export async function fetchFavoriteIds() {
  const response = await fetch(`${API_BASE}/diary/favorites/ids`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await handleJsonResponse(response, 'Не удалось загрузить избранное.');
  return Array.isArray(data) ? data : (data.ids || []);
}

export async function addFavorite(postId) {
  const response = await fetch(`${API_BASE}/diary/favorites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ post_id: postId })
  });

  return handleJsonResponse(response, 'Не удалось добавить в избранное.');
}

export async function removeFavorite(postId) {
  const response = await fetch(`${API_BASE}/diary/favorites/${postId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось убрать из избранного.');
}

export async function fetchTopics() {
  const response = await fetch(`${API_BASE}/diary/topics`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await handleJsonResponse(response, 'Не удалось загрузить топики.');
  return Array.isArray(data) ? data : (data.items || []);
}
