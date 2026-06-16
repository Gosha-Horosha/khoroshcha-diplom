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

export async function createPost(payload) {
  const response = await fetch(`${API_BASE}/diary/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  return handleJsonResponse(response, 'Не удалось создать запись.');
}

export async function getPostById(postId) {
  const response = await fetch(`${API_BASE}/diary/posts/${postId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось загрузить запись.');
}

export async function getPostChildren(postId) {
  const response = await fetch(`${API_BASE}/diary/posts/${postId}/children`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось загрузить ответы.');
}

export async function getPostThread(postId) {
  const response = await fetch(`${API_BASE}/diary/posts/${postId}/thread`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось загрузить ветку.');
}

export async function createReply(postId, payload) {
  const response = await fetch(`${API_BASE}/diary/posts/${postId}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  return handleJsonResponse(response, 'Не удалось отправить ответ.');
}

export async function updatePost(postId, payload) {
  const response = await fetch(`${API_BASE}/diary/posts/${postId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  return handleJsonResponse(response, 'Не удалось обновить запись.');
}

export async function deletePost(postId) {
  const response = await fetch(`${API_BASE}/diary/posts/${postId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  return handleJsonResponse(response, 'Не удалось удалить запись.');
}