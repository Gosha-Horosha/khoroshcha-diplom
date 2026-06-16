// js/dashboard/services/feed.js
import { API_BASE } from '../../config.js';

export async function fetchFeed(options = {}) {
  const token = localStorage.getItem('access_token');

  const headers = {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const params = new URLSearchParams();
  if (options.scope) params.set('scope', options.scope);
  if (options.kind) params.set('kind', options.kind);
  if (options.topic) params.set('topic', options.topic);
  if (options.limit) params.set('limit', String(options.limit));

  const query = params.toString();
  const url = `${API_BASE}/diary/feed${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('auth_email');
    throw new Error('Сессия истекла. Войдите снова.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.detail || `Failed to load feed (${response.status})`;
    throw new Error(detail);
  }

  return response.json();
}

export async function searchPosts(query, options = {}) {
  const token = localStorage.getItem('access_token');

  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const params = new URLSearchParams();
  params.set('q', query);
  if (options.topic) params.set('topic', options.topic);
  if (options.limit) params.set('limit', String(options.limit));

  const response = await fetch(`${API_BASE}/diary/search?${params.toString()}`, {
    method: 'GET',
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    throw new Error('Сессия истекла. Войдите снова.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Search failed (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.items || []);
}