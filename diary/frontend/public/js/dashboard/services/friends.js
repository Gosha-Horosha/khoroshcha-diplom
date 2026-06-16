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

export async function fetchFriends() {
  const response = await fetch(`${API_BASE}/diary/friends`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await handleJsonResponse(response, 'Не удалось загрузить друзей.');
  return Array.isArray(data) ? data : (data.items || []);
}

export async function fetchUsers() {
  const response = await fetch(`${API_BASE}/diary/users`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await handleJsonResponse(response, 'Не удалось загрузить пользователей.');
  return Array.isArray(data) ? data : (data.items || []);
}

export async function addFriend(friendId, isClose = false) {
  const response = await fetch(`${API_BASE}/diary/friends`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ friend_id: friendId, is_close: isClose })
  });

  return handleJsonResponse(response, 'Не удалось отправить заявку.');
}

export async function updateFriend(friendshipId, payload) {
  const response = await fetch(`${API_BASE}/diary/friends/${friendshipId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  return handleJsonResponse(response, 'Не удалось обновить дружбу.');
}

export async function removeFriend(friendshipId) {
  const response = await fetch(`${API_BASE}/diary/friends/${friendshipId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось удалить дружбу.');
}
