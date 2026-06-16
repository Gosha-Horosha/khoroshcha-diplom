// js/dashboard/app.js
import { createApp, ref, computed, onMounted, onUnmounted } from 'vue';
import { fetchFeed, searchPosts } from './services/feed.js';
import { requireAuth } from '../auth/session.js';
import {
  getPostChildren,
  createPost,
  getPostById,
  getPostThread,
  createReply,
  updatePost,
  deletePost
} from './services/posts.js';
import {
  fetchFriends,
  fetchUsers,
  addFriend,
  updateFriend,
  removeFriend
} from './services/friends.js';
import {
  fetchTopics,
  fetchFavoriteIds,
  addFavorite,
  removeFavorite
} from './services/favorites.js';
import { visibilityLabel } from '../format.js';
import { openPostPage } from '../nav.js';
import { useConfirm } from '../confirm.js';

const App = {
  setup() {
    const { confirmState, askConfirm, resolveConfirm } = useConfirm();

    const loading = ref(true);
    const error = ref('');
    const currentUser = ref(null);

    const activeMainTab = ref('feed');
    const mobileSection = ref('feed');
    const activeFeedFilter = ref('all');

    const posts = ref([]);

    const filteredPosts = computed(() => {
      const items = posts.value || [];

      switch (activeFeedFilter.value) {
        case 'mine':
          return items.filter(post => post.is_mine);
        case 'friends':
          return items.filter(post => !post.is_mine);
        case 'roots':
          return items.filter(post => !post.parent_id);
        case 'all':
        default:
          return items;
      }
    });

    const showCreateModal = ref(false);
    const creating = ref(false);
    const createError = ref('');
    const selectedPost = ref(null);
    const selectedPostChildren = ref([]);
    // Вся ветка (плоский список) для дерева в правой колонке.
    const threadItems = ref([]);
    const threadTree = computed(() => {
      const items = threadItems.value || [];
      const byParent = new Map();
      for (const it of items) {
        const key = it.parent_id || '__root__';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(it);
      }
      const build = (key) =>
        (byParent.get(key) || []).map(node => ({ ...node, children: build(node.id) }));
      return build('__root__');
    });
    const postLoading = ref(false);
    const postError = ref('');
    const replyText = ref('');
    const replyTitle = ref('');
    const replying = ref(false);
    const replyError = ref('');

    const newPost = ref({
      type: 'post',
      display_name: '',
      visibility_mode: 'private',
      status: 'active',
      content_json: {
        title: '',
        text: '',
        excerpt: '',
        topic: ''
      },
      parent_id: null
    });

    // --- Друзья и группы ---
    const friends = ref([]);
    const users = ref([]);
    const friendsLoading = ref(false);
    const friendsError = ref('');
    const friendActionId = ref(null);
    // Выбранная группа при добавлении пользователя: userId -> 'friends' | 'close_friends'
    const newFriendGroup = ref({});

    const acceptedFriends = computed(() =>
      friends.value.filter(f => f.status === 'accepted')
    );
    const incomingRequests = computed(() =>
      friends.value.filter(f => f.status === 'pending' && f.direction === 'incoming')
    );
    const outgoingRequests = computed(() =>
      friends.value.filter(f => f.status === 'pending' && f.direction === 'outgoing')
    );
    // Пользователи, которых ещё можно добавить (нет активной связи).
    const addableUsers = computed(() =>
      users.value.filter(u => !u.friendship_id)
    );

    // --- Поиск друзей/людей (по имени и почте, регистронезависимо) ---
    const friendSearch = ref('');
    function _matchUser(u) {
      const q = friendSearch.value.trim().toLowerCase();
      if (!q) return true;
      return (u.username || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q);
    }
    const filteredAcceptedFriends = computed(() => acceptedFriends.value.filter(_matchUser));
    const filteredAddableUsers = computed(() => addableUsers.value.filter(_matchUser));

    // --- Топики ---
    const topics = ref([]);
    const topicsLoading = ref(false);
    const activeTopic = ref('');

    async function loadTopics() {
      topicsLoading.value = true;
      try {
        topics.value = await fetchTopics();
      } catch (e) {
        console.error(e);
      } finally {
        topicsLoading.value = false;
      }
    }

    async function selectTopic(topic) {
      activeTopic.value = topic;
      activeMainTab.value = 'feed';
      loading.value = true;
      try {
        const data = await fetchFeed({ topic });
        posts.value = Array.isArray(data) ? data : (data.items || []);
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось загрузить записи топика.';
      } finally {
        loading.value = false;
      }
    }

    function clearTopic() {
      activeTopic.value = '';
      loadFeed();
    }

    // --- Избранное ---
    const favoriteIds = ref(new Set());
    const favBusyId = ref(null);

    async function loadFavoriteIds() {
      try {
        const ids = await fetchFavoriteIds();
        favoriteIds.value = new Set(ids);
      } catch (e) {
        console.error(e);
      }
    }

    function isFavorited(postId) {
      return favoriteIds.value.has(postId);
    }

    async function toggleFavorite(postId) {
      if (favBusyId.value) return;
      favBusyId.value = postId;
      const next = new Set(favoriteIds.value);
      try {
        if (next.has(postId)) {
          await removeFavorite(postId);
          next.delete(postId);
        } else {
          await addFavorite(postId);
          next.add(postId);
        }
        favoriteIds.value = next;
      } catch (e) {
        console.error(e);
      } finally {
        favBusyId.value = null;
      }
    }

    function goToPost(postId) {
      openPostPage(postId);
    }

    // --- Полнотекстовый поиск ---
    const searchQuery = ref('');
    const searchResults = ref([]);
    const searching = ref(false);
    const searchError = ref('');
    let searchTimer = null;

    const searchActive = computed(() => searchQuery.value.trim().length >= 2);

    async function runSearch() {
      const q = searchQuery.value.trim();
      if (q.length < 2) {
        searchResults.value = [];
        searchError.value = '';
        return;
      }

      searching.value = true;
      searchError.value = '';

      try {
        searchResults.value = await searchPosts(q);
      } catch (e) {
        console.error(e);
        searchError.value = e.message || 'Не удалось выполнить поиск.';
        searchResults.value = [];
      } finally {
        searching.value = false;
      }
    }

    function onSearchInput() {
      // Дебаунс 300мс, чтобы не дёргать сервер на каждое нажатие.
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 300);
    }

    function clearSearch() {
      searchQuery.value = '';
      searchResults.value = [];
      searchError.value = '';
      if (searchTimer) clearTimeout(searchTimer);
    }

    async function loadFriends() {
      friendsLoading.value = true;
      friendsError.value = '';

      try {
        const [friendsData, usersData] = await Promise.all([
          fetchFriends(),
          fetchUsers()
        ]);
        friends.value = friendsData;
        users.value = usersData;

        // Группа по умолчанию для добавления — обычные друзья.
        const defaults = { ...newFriendGroup.value };
        for (const user of usersData) {
          if (!defaults[user.id]) defaults[user.id] = 'friends';
        }
        newFriendGroup.value = defaults;
      } catch (e) {
        console.error(e);
        friendsError.value = e.message || 'Не удалось загрузить друзей.';
      } finally {
        friendsLoading.value = false;
      }
    }

    function groupLabel(group) {
      return group === 'close_friends' ? 'Близкие друзья' : 'Друзья';
    }

    async function sendFriendRequest(userId) {
      friendActionId.value = userId;
      friendsError.value = '';

      try {
        const group = newFriendGroup.value[userId] || 'friends';
        await addFriend(userId, group === 'close_friends');
        await loadFriends();
      } catch (e) {
        console.error(e);
        friendsError.value = e.message || 'Не удалось отправить заявку.';
      } finally {
        friendActionId.value = null;
      }
    }

    async function respondToRequest(friendshipId, accepted) {
      friendActionId.value = friendshipId;
      friendsError.value = '';

      try {
        await updateFriend(friendshipId, {
          status: accepted ? 'accepted' : 'rejected'
        });
        await loadFriends();
      } catch (e) {
        console.error(e);
        friendsError.value = e.message || 'Не удалось обработать заявку.';
      } finally {
        friendActionId.value = null;
      }
    }

    async function changeFriendGroup(friend, group) {
      friendActionId.value = friend.id;
      friendsError.value = '';

      try {
        await updateFriend(friend.id, { is_close: group === 'close_friends' });
        await loadFriends();
      } catch (e) {
        console.error(e);
        friendsError.value = e.message || 'Не удалось сменить группу.';
      } finally {
        friendActionId.value = null;
      }
    }

    async function dropFriend(friendshipId) {
      const confirmed = await askConfirm({
        title: 'Удалить из друзей?',
        message: 'Связь будет удалена у обоих. Это действие можно повторить позже.',
        confirmText: 'Удалить',
      });
      if (!confirmed) return;

      friendActionId.value = friendshipId;
      friendsError.value = '';

      try {
        await removeFriend(friendshipId);
        await loadFriends();
      } catch (e) {
        console.error(e);
        friendsError.value = e.message || 'Не удалось удалить дружбу.';
      } finally {
        friendActionId.value = null;
      }
    }

    const editingPost = ref(false);
    const savingPost = ref(false);
    const deletingPost = ref(false);
    const editError = ref('');

    const editForm = ref({
      display_name: '',
      title: '',
      text: '',
      visibility_mode: 'private'
    });

    async function loadFeed() {
      loading.value = true;
      error.value = '';

      try {
        const data = await fetchFeed();
        posts.value = Array.isArray(data) ? data : (data.items || []);
        loadFavoriteIds();
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось загрузить ленту.';
      } finally {
        loading.value = false;
      }
    }

    function openCreateModal() {
      createError.value = '';
      showCreateModal.value = true;
    }

    function closeCreateModal() {
      showCreateModal.value = false;
    }

    async function submitCreatePost() {
      createError.value = '';
      creating.value = true;

      try {
        const text = (newPost.value.content_json.text || '').trim();
        const title = (newPost.value.content_json.title || '').trim();
        const topic = (newPost.value.content_json.topic || '').trim();

        const payload = {
          type: newPost.value.type,
          display_name: newPost.value.display_name.trim() || title || 'Новая запись',
          visibility_mode: newPost.value.visibility_mode,
          status: 'active',
          parent_id: null,
          content_json: {
            title,
            text,
            topic,
            excerpt: text.slice(0, 180)
          }
        };

        await createPost(payload);

        newPost.value = {
          type: 'post',
          display_name: '',
          visibility_mode: 'private',
          status: 'active',
          content_json: {
            title: '',
            text: '',
            excerpt: '',
            topic: ''
          },
          parent_id: null
        };

        showCreateModal.value = false;
        await loadFeed();
      } catch (e) {
        console.error(e);
        createError.value = e.message || 'Не удалось создать запись.';
      } finally {
        creating.value = false;
      }
    }

    async function openPost(postId) {
      postLoading.value = true;
      postError.value = '';

      try {
        const [post, children, thread] = await Promise.all([
          getPostById(postId),
          getPostChildren(postId),
          getPostThread(postId).catch(() => ({ items: [] }))
        ]);

        selectedPost.value = post;
        selectedPostChildren.value = children;
        threadItems.value = thread.items || [];
        replyTitle.value = '';
        replyText.value = '';
        replyError.value = '';
      } catch (e) {
        console.error(e);
        postError.value = e.message || 'Не удалось загрузить запись.';
      } finally {
        postLoading.value = false;
      }
    }

    function closePost() {
      selectedPost.value = null;
      selectedPostChildren.value = [];
      threadItems.value = [];
      postError.value = '';
      replyTitle.value = '';
      replyText.value = '';
      replyError.value = '';
    }

    async function submitReply() {
      if (!selectedPost.value) return;

      const text = replyText.value.trim();
      const title = replyTitle.value.trim();

      if (!text) {
        replyError.value = 'Напиши текст ответа.';
        return;
      }

      replying.value = true;
      replyError.value = '';

      try {
        await createReply(selectedPost.value.id, {
          type: 'post',
          display_name: title || 'Ответ',
          visibility_mode: selectedPost.value.visibility_mode || 'private',
          status: 'active',
          content_json: {
            title,
            text,
            excerpt: text.slice(0, 180)
          }
        });

        selectedPostChildren.value = await getPostChildren(selectedPost.value.id);
        const thread = await getPostThread(selectedPost.value.id).catch(() => ({ items: [] }));
        threadItems.value = thread.items || [];
        replyTitle.value = '';
        replyText.value = '';
      } catch (e) {
        console.error(e);
        replyError.value = e.message || 'Не удалось отправить ответ.';
      } finally {
        replying.value = false;
      }
    }

    function formatDate(value) {
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

    function startEditPost() {
      if (!selectedPost.value) return;

      editingPost.value = true;
      editError.value = '';

      editForm.value = {
        display_name: selectedPost.value.display_name || '',
        title: selectedPost.value.title || selectedPost.value.content_json?.title || '',
        text: selectedPost.value.content_json?.text || selectedPost.value.excerpt || '',
        visibility_mode: selectedPost.value.visibility_mode || 'private'
      };
    }

    function cancelEditPost() {
      editingPost.value = false;
      savingPost.value = false;
      editError.value = '';
    }

    function setMainTab(tab) {
      activeMainTab.value = tab;
      if (tab === 'friends' && !friendsLoading.value) {
        loadFriends();
      }
      if (tab === 'topics' && !topicsLoading.value) {
        loadTopics();
      }
    }

    async function savePostEdit() {
      if (!selectedPost.value) return;

      savingPost.value = true;
      editError.value = '';

      const text = editForm.value.text.trim();
      const title = editForm.value.title.trim();
      const displayName = editForm.value.display_name.trim() || title || 'Запись';

      try {
        const updated = await updatePost(selectedPost.value.id, {
          display_name: displayName,
          visibility_mode: editForm.value.visibility_mode,
          content_json: {
            ...(selectedPost.value.content_json || {}),
            title,
            text,
            excerpt: text.slice(0, 180)
          }
        });

        selectedPost.value = updated;
        editingPost.value = false;
        await loadFeed();
      } catch (e) {
        console.error(e);
        editError.value = e.message || 'Не удалось сохранить изменения.';
      } finally {
        savingPost.value = false;
      }
    }

    async function removePost() {
      if (!selectedPost.value) return;

      const confirmed = await askConfirm({
        title: 'Удалить запись?',
        message: 'Запись и все её продолжения будут удалены без возможности восстановления.',
        confirmText: 'Удалить',
      });
      if (!confirmed) return;

      deletingPost.value = true;
      editError.value = '';

      try {
        const deletedId = selectedPost.value.id;
        await deletePost(deletedId);

        selectedPost.value = null;
        selectedPostChildren.value = [];
        editingPost.value = false;

        await loadFeed();
      } catch (e) {
        console.error(e);
        editError.value = e.message || 'Не удалось удалить запись.';
      } finally {
        deletingPost.value = false;
      }
    }

    // Живая статистика для правой колонки.
    const stats = computed(() => {
      const mine = (posts.value || []).filter(p => p.is_mine);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const week = mine.filter(
        p => p.created_at && new Date(p.created_at).getTime() >= weekAgo
      );
      return {
        mine: mine.length,
        week: week.length,
        favorites: favoriteIds.value.size,
        friends: acceptedFriends.value.length,
      };
    });

    // Топ топиков для правой колонки.
    const topTopics = computed(() => (topics.value || []).slice(0, 5));

    // Заголовок топбара отражает текущий раздел.
    const sectionTitle = computed(() => {
      if (searchActive.value) return 'Поиск';
      if (selectedPost.value) return 'Запись';
      if (activeMainTab.value === 'topics') return 'Топики';
      if (activeMainTab.value === 'friends') return 'Друзья';
      return 'Все записи';
    });

    function setMobileSection(section) {
      mobileSection.value = section;
      if (section === 'feed') activeMainTab.value = 'feed';
      if (section === 'topics') activeMainTab.value = 'topics';
      if (section === 'friends') activeMainTab.value = 'friends';
    }

    // Горячие клавиши (десктоп): / — поиск, n — новая запись, Esc — закрыть.
    function onKeydown(e) {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

      if (e.key === 'Escape') {
        if (confirmState.value.show) resolveConfirm(false);
        else if (showCreateModal.value) closeCreateModal();
        else if (selectedPost.value) closePost();
        else if (searchQuery.value) clearSearch();
        return;
      }
      if (typing) return;

      if (e.key === '/') {
        e.preventDefault();
        document.querySelector('.global-search input')?.focus();
      } else if (e.key === 'n' || e.key === 'т') {
        e.preventDefault();
        openCreateModal();
      }
    }

    onMounted(async () => {
      const user = await requireAuth();

      if (!user) {
        return;
      }

      currentUser.value = user;
      await loadFeed();
      // Подгружаем друзей и топики, чтобы правая колонка и сайдбар заполнились сразу.
      loadFriends();
      loadTopics();
      window.addEventListener('keydown', onKeydown);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeydown);
    });

    return {
      loading,
      error,
      posts,
      filteredPosts,
      stats,
      topTopics,
      sectionTitle,
      confirmState,
      resolveConfirm,
      currentUser,
      activeMainTab,
      mobileSection,
      setMainTab,
      setMobileSection,
      showCreateModal,
      creating,
      createError,
      newPost,
      openCreateModal,
      closeCreateModal,
      submitCreatePost,
      selectedPost,
      selectedPostChildren,
      threadItems,
      threadTree,
      postLoading,
      postError,
      replyText,
      replyTitle,
      replying,
      replyError,
      openPost,
      closePost,
      submitReply,
      editingPost,
      savingPost,
      deletingPost,
      editError,
      editForm,
      formatDate,
      startEditPost,
      cancelEditPost,
      savePostEdit,
      removePost,
      activeFeedFilter,
      friends,
      users,
      friendsLoading,
      friendsError,
      friendActionId,
      newFriendGroup,
      acceptedFriends,
      incomingRequests,
      outgoingRequests,
      addableUsers,
      friendSearch,
      filteredAcceptedFriends,
      filteredAddableUsers,
      loadFriends,
      groupLabel,
      sendFriendRequest,
      respondToRequest,
      changeFriendGroup,
      dropFriend,
      topics,
      topicsLoading,
      activeTopic,
      loadTopics,
      selectTopic,
      clearTopic,
      isFavorited,
      favBusyId,
      toggleFavorite,
      goToPost,
      visibilityLabel,
      searchQuery,
      searchResults,
      searching,
      searchError,
      searchActive,
      onSearchInput,
      runSearch,
      clearSearch,
    };
  },

  template: `
    <div class="app-shell">
    <div v-if="confirmState.show" class="modal-backdrop" @click="resolveConfirm(false)">
      <div class="modal-card confirm-card" @click.stop>
        <div class="section-head"><h3>{{ confirmState.title }}</h3></div>
        <p class="confirm-message">{{ confirmState.message }}</p>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="resolveConfirm(false)">{{ confirmState.cancelText }}</button>
          <button type="button" class="new-entry" :class="{ 'danger-solid': confirmState.danger }" @click="resolveConfirm(true)">{{ confirmState.confirmText }}</button>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="modal-backdrop" @click="closeCreateModal">
  <div class="modal-card" @click.stop>
    <div class="section-head">
      <h3>Новая запись</h3>
    </div>

    <div class="form-stack">
      <label>
        <span>Заголовок</span>
        <input v-model="newPost.content_json.title" type="text" placeholder="О чем эта запись?" />
      </label>

      <label>
        <span>Короткое имя</span>
        <input v-model="newPost.display_name" type="text" placeholder="Название карточки" />
      </label>

      <label>
        <span>Видимость</span>
        <select v-model="newPost.visibility_mode">
          <option value="private">Только я</option>
          <option value="friends">Друзья</option>
          <option value="close_friends">Близкие друзья</option>
          <option value="public">Публично</option>
        </select>
      </label>

      <label>
        <span>Топик</span>
        <input v-model="newPost.content_json.topic" type="text" placeholder="Например: дневник, идеи, работа" />
      </label>

      <label>
        <span>Текст</span>
        <textarea
          v-model="newPost.content_json.text"
          rows="8"
          placeholder="Начни писать..."
        ></textarea>
      </label>

      <p v-if="createError" class="form-error">{{ createError }}</p>

      <div class="modal-actions">
        <button type="button" class="ghost-btn" @click="closeCreateModal">Отмена</button>
        <button type="button" class="new-entry" @click="submitCreatePost" :disabled="creating">
          {{ creating ? 'Сохраняем...' : 'Создать запись' }}
        </button>
      </div>
    </div>
  </div>
</div>

      <aside class="sidebar panel" aria-label="Боковая навигация">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
              <path d="M12 6.5C10.6 5.2 8.7 4.5 6.5 4.5H4v13h2.5c2.2 0 4.1.7 5.5 2"></path>
              <path d="M12 6.5c1.4-1.3 3.3-2 5.5-2H20v13h-2.5c-2.2 0-4.1.7-5.5 2"></path>
              <path d="M12 6.5v14"></path>
              <path d="M15.5 9.5l2-1.2 2 1.2"></path>
            </svg>
          </div>
          Archive
        </div>

           <button class="new-entry" type="button" @click="openCreateModal">Новая запись</button>


        <section class="sidebar-block">
          <div class="block-title">Навигация</div>
          <nav class="nav-list">
            <a class="nav-link" href="./profile.html">
              <span class="nav-main">
                <span class="icon-wrap">◌</span>
                Профиль
              </span>
            </a>

            <button
              type="button"
              class="nav-link"
              :aria-current="activeMainTab === 'feed' ? 'page' : undefined"
              @click="setMainTab('feed')"
            >
              <span class="nav-main">
                <span class="icon-wrap">⌂</span>
                Все записи
              </span>
            </button>

            <button
              type="button"
              class="nav-link"
              :aria-current="activeMainTab === 'topics' ? 'page' : undefined"
              @click="setMainTab('topics')"
            >
              <span class="nav-main">
                <span class="icon-wrap">#</span>
                Топики
              </span>
            </button>

            <button
              type="button"
              class="nav-link"
              :aria-current="activeMainTab === 'friends' ? 'page' : undefined"
              @click="setMainTab('friends')"
            >
              <span class="nav-main">
                <span class="icon-wrap">♡</span>
                Друзья
              </span>
            </button>

            <a class="nav-link" href="./favorites.html">
              <span class="nav-main">
                <span class="icon-wrap">★</span>
                Избранное
              </span>
            </a>
          </nav>
        </section>

        <section class="sidebar-block">
          <div class="block-title">Друзья</div>
          <p v-if="friendsLoading && !acceptedFriends.length" class="sidebar-hint">Загружаем…</p>
          <p v-else-if="!acceptedFriends.length" class="sidebar-hint">
            Пока никого нет — добавьте людей во вкладке «Друзья».
          </p>
          <div v-else class="filter-list">
            <button
              v-for="friend in acceptedFriends.slice(0, 8)"
              :key="friend.id"
              type="button"
              class="filter-item"
              @click="setMainTab('friends')"
            >
              <span class="nav-main">
                <span class="avatar avatar-sm" aria-hidden="true">{{ (friend.username || '?').charAt(0).toUpperCase() }}</span>
                {{ friend.username }}
              </span>
            </button>
            <button
              v-if="acceptedFriends.length > 8"
              type="button"
              class="filter-item"
              @click="setMainTab('friends')"
            >
              <span class="nav-main"><span class="icon-wrap">→</span>Ещё {{ acceptedFriends.length - 8 }}</span>
            </button>
          </div>
        </section>

      </aside>

      <main class="main" id="main">
        <section class="main-topbar" aria-label="Основные элементы страницы">
          <div class="topbar-row">
            <div class="headline">
              <h1>{{ sectionTitle }}</h1>
              <p>Живая лента записей от вас и друзей.</p>
            </div>
            <div class="utility">
              <div class="global-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="m20 20-3.5-3.5"></path>
                </svg>
                <input
                  type="search"
                  placeholder="Поиск по записям, топикам и авторам"
                  v-model="searchQuery"
                  @input="onSearchInput"
                  @keyup.enter="runSearch"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="search-clear"
                  @click="clearSearch"
                  aria-label="Очистить поиск"
                >✕</button>
              </div>
            </div>
          </div>
        </section>

        <section class="feed-wrapper" aria-label="Результаты поиска" v-show="searchActive && !selectedPost">
  <div class="section-head">
    <h2>Поиск: «{{ searchQuery.trim() }}»</h2>
    <button type="button" class="ghost-btn" @click="clearSearch">Очистить</button>
  </div>

  <div v-if="searching" class="post-panel-state"><p>Ищем…</p></div>
  <div v-else-if="searchError" class="post-panel-state"><p>{{ searchError }}</p></div>
  <div v-else-if="!searchResults.length" class="post-panel-state">
    <p>Ничего не найдено по запросу «{{ searchQuery.trim() }}».</p>
  </div>

  <div v-else class="feed-list">
    <article
      v-for="item in searchResults"
      :key="item.id"
      class="feed-card"
      @click="openPost(item.id)"
    >
      <div class="section-head">
        <span v-if="item.parent_id" class="chip">Продолжение</span>
        <span class="muted-text">{{ formatDate(item.created_at) }}</span>
      </div>

      <h3 class="post-title">
        {{ item.title || item.content_json?.title || item.display_name || 'Запись без заголовка' }}
      </h3>

      <p class="post-excerpt">
        {{ item.excerpt || item.preview || item.content_json?.text || '' }}
      </p>

      <div class="post-footer">
        <div class="post-tags">
          <span v-if="item.is_mine" class="tag">Моё</span>
          <span v-if="item.topic" class="tag">#{{ item.topic }}</span>
          <span class="tag">{{ visibilityLabel(item.visibility_mode) }}</span>
        </div>
        <button type="button" class="ghost-btn" @click.stop="goToPost(item.id)">Читать →</button>
      </div>
    </article>
  </div>
</section>

        <section class="feed-wrapper" aria-label="Лента записей" v-show="!searchActive && !selectedPost && activeMainTab !== 'friends' && activeMainTab !== 'topics'">
  <div class="section-head">
    <h2>Все записи</h2>
    <span class="inline-hint">Записи от вас и друзей. <kbd>n</kbd> — новая, <kbd>/</kbd> — поиск.</span>
  </div>

  <div v-if="loading" class="feed-list">
    <article v-for="i in 4" :key="i" class="post-card skeleton-card" aria-hidden="true">
      <div class="skeleton-line skeleton-line--sm"></div>
      <div class="skeleton-line skeleton-line--title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line--short"></div>
    </article>
  </div>

  <div v-else-if="error" class="feed-list">
    <article class="post-card">
      <p class="post-excerpt">Ошибка: {{ error }}</p>
    </article>
  </div>

  <div v-else-if="filteredPosts.length === 0" class="feed-list">
    <article class="post-card">
      <h3 class="post-title">Пока здесь пусто</h3>
      <p class="post-excerpt">
        Как только вы или ваши друзья начнут писать, лента заполнится записями.
      </p>
    </article>
  </div>

  <template v-else>
    <div class="feed-filters">
      <button
        type="button"
        class="filter-chip"
        :class="{ active: activeFeedFilter === 'all' }"
        @click="activeFeedFilter = 'all'"
      >
        Все
      </button>

      <button
        type="button"
        class="filter-chip"
        :class="{ active: activeFeedFilter === 'mine' }"
        @click="activeFeedFilter = 'mine'"
      >
        Мои
      </button>

      <button
        type="button"
        class="filter-chip"
        :class="{ active: activeFeedFilter === 'friends' }"
        @click="activeFeedFilter = 'friends'"
      >
        От друзей
      </button>

      <button
        type="button"
        class="filter-chip"
        :class="{ active: activeFeedFilter === 'roots' }"
        @click="activeFeedFilter = 'roots'"
      >
        Корневые
      </button>
    </div>

    <div v-if="activeTopic" class="feed-filters">
      <span class="chip">Топик: #{{ activeTopic }}</span>
      <button type="button" class="filter-chip" @click="clearTopic">Сбросить топик ✕</button>
    </div>

    <div class="feed-list">
      <article
  v-for="item in filteredPosts"
  :key="item.id"
  class="feed-card"
  @click="openPost(item.id)"
>
  <div class="section-head">
    <span v-if="item.parent_id" class="chip">Продолжение</span>
    <span class="muted-text">{{ formatDate(item.created_at) }}</span>
  </div>

  <h3 class="post-title">
    {{ item.title || item.content_json?.title || item.display_name || 'Запись без заголовка' }}
  </h3>

  <p class="post-excerpt">
    {{ item.excerpt || item.preview || item.content_json?.text || '' }}
  </p>

  <div class="post-footer">
    <div class="post-tags">
      <span v-if="item.is_mine" class="tag">Моё</span>
      <span v-if="item.topic" class="tag">#{{ item.topic }}</span>
      <span class="tag">{{ visibilityLabel(item.visibility_mode) }}</span>
    </div>

    <div class="post-tags">
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="isFavorited(item.id)"
        @click.stop="toggleFavorite(item.id)"
        :disabled="favBusyId === item.id"
        :title="isFavorited(item.id) ? 'Убрать из избранного' : 'В избранное'"
      >{{ isFavorited(item.id) ? '★' : '☆' }}</button>

      <button type="button" class="ghost-btn" @click.stop="goToPost(item.id)">
        Читать →
      </button>
    </div>
  </div>
</article>
    </div>
  </template>
</section>
<section class="post-panel" v-if="selectedPost || postLoading || postError">
  <div class="section-head">
    <h3>
      {{
        selectedPost
          ? (selectedPost.title || selectedPost.content_json?.title || selectedPost.display_name || 'Запись')
          : 'Запись'
      }}
    </h3>

    <button
      v-if="selectedPost"
      type="button"
      class="ghost-btn"
      @click="closePost"
    >
      Закрыть
    </button>
  </div>

  <div v-if="postLoading" class="post-panel-state">
    <p>Загружаем запись...</p>
  </div>

  <div v-else-if="postError" class="post-panel-state">
    <p>{{ postError }}</p>
  </div>

  <template v-else-if="selectedPost">
    <article class="post-detail-card">
      <div class="post-meta-row">
        <span class="chip">{{ visibilityLabel(selectedPost.visibility_mode) }}</span>
        <span v-if="selectedPost.topic || selectedPost.content_json?.topic" class="tag">#{{ selectedPost.topic || selectedPost.content_json?.topic }}</span>
        <span class="muted-text">{{ formatDate(selectedPost.created_at) }}</span>
      </div>

      <div v-if="!editingPost">
        <h4 class="post-title">
          {{
            selectedPost.title
            || selectedPost.content_json?.title
            || selectedPost.display_name
            || 'Запись без заголовка'
          }}
        </h4>

        <p class="post-excerpt">
          {{
            selectedPost.content_json?.text
            || selectedPost.excerpt
            || selectedPost.preview
            || ''
          }}
        </p>

        <div class="modal-actions" style="margin-top: 16px;">
          <button type="button" class="new-entry" @click="goToPost(selectedPost.id)">
            Читать полностью →
          </button>
          <button
            type="button"
            class="ghost-btn"
            :class="{ 'is-fav': isFavorited(selectedPost.id) }"
            @click="toggleFavorite(selectedPost.id)"
            :disabled="favBusyId === selectedPost.id"
          >
            {{ isFavorited(selectedPost.id) ? '★ В избранном' : '☆ В избранное' }}
          </button>
        </div>

        <p
          v-if="editError"
          class="form-error"
          style="margin-top: 12px;"
        >
          {{ editError }}
        </p>

        <div
          v-if="selectedPost.is_mine"
          class="modal-actions"
          style="margin-top: 16px;"
        >
          <button
            type="button"
            class="ghost-btn"
            @click="startEditPost"
          >
            Редактировать
          </button>

          <button
            type="button"
            class="ghost-btn danger-btn"
            @click="removePost"
            :disabled="deletingPost"
          >
            {{ deletingPost ? 'Удаляем...' : 'Удалить' }}
          </button>
        </div>
      </div>

      <div v-else class="form-stack">
        <label>
          <span>Заголовок</span>
          <input
            v-model="editForm.title"
            type="text"
            placeholder="Заголовок записи"
          />
        </label>

        <label>
          <span>Короткое имя</span>
          <input
            v-model="editForm.display_name"
            type="text"
            placeholder="Название карточки"
          />
        </label>

        <label>
          <span>Видимость</span>
          <select v-model="editForm.visibility_mode">
            <option value="private">Только я</option>
            <option value="friends">Друзья</option>
            <option value="close_friends">Близкие друзья</option>
            <option value="public">Публично</option>
          </select>
        </label>

        <label>
          <span>Текст</span>
          <textarea
            v-model="editForm.text"
            rows="7"
            placeholder="Обнови текст записи"
          ></textarea>
        </label>

        <p v-if="editError" class="form-error">
          {{ editError }}
        </p>

        <div class="modal-actions">
          <button
            type="button"
            class="ghost-btn"
            @click="cancelEditPost"
          >
            Отмена
          </button>

          <button
            type="button"
            class="new-entry"
            @click="savePostEdit"
            :disabled="savingPost"
          >
            {{ savingPost ? 'Сохраняем...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </article>

    <section class="reply-box">
      <div class="section-head">
        <h4>Добавить продолжение</h4>
      </div>

      <div class="form-stack">
        <label>
          <span>Заголовок продолжения</span>
          <input
            v-model="replyTitle"
            type="text"
            placeholder="Необязательно"
          />
        </label>

        <label>
          <span>Текст продолжения</span>
          <textarea
            v-model="replyText"
            rows="5"
            placeholder="Продолжи историю..."
          ></textarea>
        </label>

        <p v-if="replyError" class="form-error">
          {{ replyError }}
        </p>

        <div class="modal-actions">
          <button
            type="button"
            class="new-entry"
            @click="submitReply"
            :disabled="replying"
          >
            {{ replying ? 'Сохраняем...' : 'Добавить продолжение' }}
          </button>
        </div>
      </div>
    </section>

    <section class="children-list">
      <div class="section-head">
        <h4>Продолжения</h4>
        <span class="muted-text">{{ selectedPostChildren.length }}</span>
      </div>

      <div v-if="!selectedPostChildren.length" class="post-panel-state">
        <p>Пока нет продолжений.</p>
      </div>

      <article
        v-for="child in selectedPostChildren"
        :key="child.id"
        class="post-card child-card"
        @click="goToPost(child.id)"
        style="cursor: pointer;"
      >
        <div class="post-meta-row">
          <span class="chip">{{ visibilityLabel(child.visibility_mode) }}</span>
          <span class="muted-text">{{ formatDate(child.created_at) }}</span>
        </div>

        <h3 class="post-title">
          {{
            child.title
            || child.content_json?.title
            || child.display_name
            || 'Продолжение'
          }}
        </h3>

        <p class="post-excerpt">
          {{
            child.content_json?.text
            || child.excerpt
            || child.preview
            || ''
          }}
        </p>
      </article>
    </section>
  </template>
</section>

<section class="feed-wrapper" aria-label="Топики" v-show="!searchActive && activeMainTab === 'topics'">
  <div class="section-head">
    <h2>Топики</h2>
    <span class="inline-hint">Выберите тему, чтобы отфильтровать ленту.</span>
  </div>

  <div v-if="topicsLoading" class="post-panel-state">
    <p>Загружаем топики…</p>
  </div>

  <div v-else-if="!topics.length" class="post-panel-state">
    <p>Пока нет ни одной темы. Добавьте топик при создании записи.</p>
  </div>

  <div v-else class="topic-grid">
    <article
      v-for="t in topics"
      :key="t.topic"
      class="topic-card"
      :class="{ active: activeTopic === t.topic }"
      @click="selectTopic(t.topic)"
    >
      <span class="topic-name">#{{ t.topic }}</span>
      <span class="muted-text">{{ t.count }} запис.</span>
    </article>
  </div>
</section>

<section class="feed-wrapper" aria-label="Друзья" v-show="!searchActive && activeMainTab === 'friends'">
  <div class="section-head">
    <h2>Друзья</h2>
    <span class="inline-hint">Добавляйте людей и распределяйте их по группам.</span>
  </div>

  <div class="global-search friends-search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m20 20-3.5-3.5"></path>
    </svg>
    <input
      type="search"
      placeholder="Поиск по имени или почте"
      v-model="friendSearch"
    />
    <button
      v-if="friendSearch"
      type="button"
      class="search-clear"
      @click="friendSearch = ''"
      aria-label="Очистить поиск"
    >✕</button>
  </div>

  <p v-if="friendsError" class="form-error">{{ friendsError }}</p>

  <div v-if="friendsLoading" class="post-panel-state">
    <p>Загружаем друзей…</p>
  </div>

  <template v-else>
    <div v-if="incomingRequests.length" class="friends-group">
      <div class="block-title">Входящие заявки</div>
      <article
        v-for="req in incomingRequests"
        :key="req.id"
        class="post-card friend-card"
      >
        <div class="friend-info">
          <span class="avatar avatar-sm" aria-hidden="true">{{ (req.username || '?').charAt(0).toUpperCase() }}</span>
          <div>
            <h3 class="post-title">{{ req.username }}</h3>
            <p class="muted-text">{{ req.email }} · хочет в «{{ groupLabel(req.group) }}»</p>
          </div>
        </div>
        <div class="post-tags">
          <button
            type="button"
            class="new-entry"
            @click="respondToRequest(req.id, true)"
            :disabled="friendActionId === req.id"
          >Принять</button>
          <button
            type="button"
            class="ghost-btn danger-btn"
            @click="respondToRequest(req.id, false)"
            :disabled="friendActionId === req.id"
          >Отклонить</button>
        </div>
      </article>
    </div>

    <div class="friends-group">
      <div class="block-title">Мои друзья ({{ acceptedFriends.length }})</div>
      <div v-if="!acceptedFriends.length" class="post-panel-state">
        <p>Пока никого нет. Добавьте друзей из списка ниже.</p>
      </div>
      <div v-else-if="!filteredAcceptedFriends.length" class="post-panel-state">
        <p>Среди друзей никто не подходит под «{{ friendSearch.trim() }}».</p>
      </div>
      <article
        v-for="friend in filteredAcceptedFriends"
        :key="friend.id"
        class="post-card friend-card"
      >
        <div class="friend-info">
          <span class="avatar avatar-sm" aria-hidden="true">{{ (friend.username || '?').charAt(0).toUpperCase() }}</span>
          <div>
            <h3 class="post-title">{{ friend.username }}</h3>
            <p class="muted-text">{{ friend.email }}</p>
          </div>
        </div>
        <div class="post-tags friend-actions">
          <label class="friend-group-select">
            <span class="muted-text">Группа</span>
            <select
              :value="friend.group"
              @change="changeFriendGroup(friend, $event.target.value)"
              :disabled="friendActionId === friend.id"
            >
              <option value="friends">Друзья</option>
              <option value="close_friends">Близкие друзья</option>
            </select>
          </label>
          <button
            type="button"
            class="ghost-btn danger-btn"
            @click="dropFriend(friend.id)"
            :disabled="friendActionId === friend.id"
          >Удалить</button>
        </div>
      </article>
    </div>

    <div v-if="outgoingRequests.length" class="friends-group">
      <div class="block-title">Отправленные заявки</div>
      <article
        v-for="req in outgoingRequests"
        :key="req.id"
        class="post-card friend-card"
      >
        <div class="friend-info">
          <span class="avatar avatar-sm" aria-hidden="true">{{ (req.username || '?').charAt(0).toUpperCase() }}</span>
          <div>
            <h3 class="post-title">{{ req.username }}</h3>
            <p class="muted-text">Ожидает подтверждения · «{{ groupLabel(req.group) }}»</p>
          </div>
        </div>
        <button
          type="button"
          class="ghost-btn danger-btn"
          @click="dropFriend(req.id)"
          :disabled="friendActionId === req.id"
        >Отменить</button>
      </article>
    </div>

    <div class="friends-group">
      <div class="block-title">Добавить друзей</div>
      <div v-if="!addableUsers.length" class="post-panel-state">
        <p>Нет доступных пользователей.</p>
      </div>
      <div v-else-if="!filteredAddableUsers.length" class="post-panel-state">
        <p>Никто не найден по «{{ friendSearch.trim() }}».</p>
      </div>
      <article
        v-for="user in filteredAddableUsers"
        :key="user.id"
        class="post-card friend-card"
      >
        <div class="friend-info">
          <span class="avatar avatar-sm" aria-hidden="true">{{ (user.username || '?').charAt(0).toUpperCase() }}</span>
          <div>
            <h3 class="post-title">{{ user.username }}</h3>
            <p class="muted-text">{{ user.email }}</p>
          </div>
        </div>
        <div class="post-tags friend-actions">
          <label class="friend-group-select">
            <span class="muted-text">Группа</span>
            <select v-model="newFriendGroup[user.id]">
              <option value="friends">Друзья</option>
              <option value="close_friends">Близкие друзья</option>
            </select>
          </label>
          <button
            type="button"
            class="new-entry"
            @click="sendFriendRequest(user.id)"
            :disabled="friendActionId === user.id"
          >Добавить</button>
        </div>
      </article>
    </div>
  </template>
</section>

      </main>

      <aside class="rightbar panel" aria-label="Правая колонка с контекстом">
        <section class="rightbar-card thread-card" v-if="selectedPost && threadTree.length">
          <div class="section-head">
            <h3>Ветка</h3>
            <span class="muted-text">{{ threadItems.length }}</span>
          </div>
          <div class="thread-tree">
            <thread-node
              v-for="node in threadTree"
              :key="node.id"
              :node="node"
              :selected-id="selectedPost.id"
              @select="openPost"
            />
          </div>
        </section>

        <a class="rightbar-card profile-card" href="./profile.html" aria-label="Перейти в профиль">
          <div class="section-head">
            <div class="block-title">Профиль</div>
            <span class="muted-text">Открыть →</span>
          </div>
          <p class="profile-bio" v-if="currentUser">
            {{ currentUser.username }} · {{ currentUser.email }}
          </p>
          <p class="profile-bio" v-else>
            Данные пользователя загружаются…
          </p>
        </a>

        <section class="rightbar-card" v-if="!selectedPost">
          <div class="section-head">
            <h3>Сводка</h3>
          </div>
          <div class="stat-grid">
            <div class="stat-cell">
              <span class="stat-value">{{ stats.mine }}</span>
              <span class="stat-label">мои записи</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ stats.week }}</span>
              <span class="stat-label">за неделю</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ stats.favorites }}</span>
              <span class="stat-label">в избранном</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ stats.friends }}</span>
              <span class="stat-label">друзей</span>
            </div>
          </div>
        </section>

        <section class="rightbar-card" v-if="!selectedPost && incomingRequests.length">
          <div class="section-head">
            <h3>Заявки в друзья</h3>
            <span class="muted-text">{{ incomingRequests.length }}</span>
          </div>
          <div
            v-for="req in incomingRequests"
            :key="req.id"
            class="request-row"
          >
            <div class="friend-info">
              <span class="avatar avatar-sm" aria-hidden="true">{{ (req.username || '?').charAt(0).toUpperCase() }}</span>
              <div>
                <div class="post-title">{{ req.username }}</div>
                <p class="muted-text">«{{ groupLabel(req.group) }}»</p>
              </div>
            </div>
            <div class="post-tags">
              <button type="button" class="new-entry" @click="respondToRequest(req.id, true)" :disabled="friendActionId === req.id">Принять</button>
              <button type="button" class="ghost-btn danger-btn" @click="respondToRequest(req.id, false)" :disabled="friendActionId === req.id">✕</button>
            </div>
          </div>
        </section>

        <section class="rightbar-card" v-if="!selectedPost && topTopics.length">
          <div class="section-head">
            <h3>Ваши топики</h3>
            <button v-if="activeTopic" type="button" class="ghost-btn" @click="clearTopic">Сбросить</button>
          </div>
          <div class="topic-chips">
            <button
              v-for="t in topTopics"
              :key="t.topic"
              type="button"
              class="filter-chip"
              :class="{ active: activeTopic === t.topic }"
              @click="selectTopic(t.topic)"
            >#{{ t.topic }} <span class="muted-text">{{ t.count }}</span></button>
          </div>
        </section>
      </aside>

      <div class="mobile-bottom-nav" aria-label="Нижняя навигация">
        <nav>
          <button class="mobile-tab" :class="{ active: mobileSection === 'feed' }" type="button" @click="setMobileSection('feed')">⌂<span>Лента</span></button>
          <button class="mobile-tab" :class="{ active: mobileSection === 'topics' }" type="button" @click="setMobileSection('topics')">#<span>Топики</span></button>
          <button class="mobile-tab" :class="{ active: mobileSection === 'new' }" type="button" @click="setMobileSection('new')">＋<span>Новая</span></button>
          <button class="mobile-tab" :class="{ active: mobileSection === 'friends' }" type="button" @click="setMobileSection('friends')">♡<span>Друзья</span></button>
          <button class="mobile-tab" :class="{ active: mobileSection === 'profile' }" type="button" @click="setMobileSection('profile')">◌<span>Профиль</span></button>
        </nav>
      </div>
    </div>
  `
};

// Рекурсивный узел дерева ветки (родитель → продолжения с отступами).
const ThreadNode = {
  name: 'ThreadNode',
  props: {
    node: { type: Object, required: true },
    selectedId: { type: String, default: null },
  },
  emits: ['select'],
  template: `
    <div class="thread-node">
      <button
        type="button"
        class="thread-item"
        :class="{ active: node.id === selectedId }"
        @click="$emit('select', node.id)"
      >
        <span class="thread-title">
          {{ node.title || node.content_json?.title || node.display_name || 'Запись' }}
        </span>
        <span class="thread-snippet" v-if="node.excerpt || node.preview">
          {{ node.excerpt || node.preview }}
        </span>
      </button>
      <div v-if="node.children && node.children.length" class="thread-children">
        <thread-node
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected-id="selectedId"
          @select="$emit('select', $event)"
        />
      </div>
    </div>
  `,
};

const app = createApp(App);
app.component('thread-node', ThreadNode);
app.mount('#app');