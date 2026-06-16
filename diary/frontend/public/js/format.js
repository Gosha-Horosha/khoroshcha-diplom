// Общие хелперы форматирования для всех страниц.

const VISIBILITY_LABELS = {
  private: 'Только я',
  friends: 'Друзья',
  close_friends: 'Близкие друзья',
  public: 'Публично'
};

export const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Только я' },
  { value: 'friends', label: 'Друзья' },
  { value: 'close_friends', label: 'Близкие друзья' },
  { value: 'public', label: 'Публично' }
];

export function visibilityLabel(mode) {
  return VISIBILITY_LABELS[mode] || 'Только я';
}

export function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
