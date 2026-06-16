// Навигация к чтению записи без раскрытия id в адресной строке.
// id передаётся через sessionStorage, в URL остаётся чистый ./post.html.

const POST_ID_KEY = 'archive:post_id';

export function openPostPage(id) {
  if (!id) return;
  try {
    sessionStorage.setItem(POST_ID_KEY, String(id));
  } catch (e) {
    // sessionStorage может быть недоступен — тогда отдадим id через адрес.
    window.location.href = `./post.html?id=${id}`;
    return;
  }
  window.location.href = './post.html';
}

export function readPostId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('id');

  // Поддерживаем старые ссылки с ?id=, но сразу убираем id из адреса.
  if (fromQuery) {
    try {
      sessionStorage.setItem(POST_ID_KEY, fromQuery);
    } catch (e) { /* no-op */ }
    window.history.replaceState({}, '', './post.html');
    return fromQuery;
  }

  try {
    return sessionStorage.getItem(POST_ID_KEY);
  } catch (e) {
    return null;
  }
}
