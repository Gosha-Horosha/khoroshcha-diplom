// js/profile/app.js
import { createApp, ref, computed, onMounted } from 'vue';
import { requireAuth, logout, clearAuth } from '../auth/session.js';
import { fetchFeed } from '../dashboard/services/feed.js';
import { deletePost, updatePost, createPost } from '../dashboard/services/posts.js';
import { fetchProfile, updateProfile, deleteAccount } from './service.js';
import { visibilityLabel, formatDate } from '../format.js';
import { openPostPage } from '../nav.js';
import { useConfirm } from '../confirm.js';

const App = {
  setup() {
    const { confirmState, askConfirm, resolveConfirm } = useConfirm();

    const loading = ref(true);
    const error = ref('');
    const currentUser = ref(null);

    const posts = ref([]);
    const activeFilter = ref('all');
    const deletingId = ref(null);

    // Вкладки профиля: записи / дневник / редактирование.
    const profileTab = ref('posts');

    // Фильтры по топикам и датам.
    const topicFilter = ref('all');
    const dateFrom = ref('');
    const dateTo = ref('');

    const totalPosts = computed(() => posts.value.length);
    const totalRoots = computed(
      () => posts.value.filter(post => !post.parent_id).length
    );
    const totalReplies = computed(
      () => posts.value.filter(post => !!post.parent_id).length
    );
    const totalPrivate = computed(
      () => posts.value.filter(post => (post.visibility_mode || 'private') === 'private').length
    );

    function postTopic(post) {
      return (post.topic || post.content_json?.topic || '').trim();
    }

    const availableTopics = computed(() => {
      const set = new Set();
      for (const post of posts.value) {
        const topic = postTopic(post);
        if (topic) set.add(topic);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
    });

    const filteredPosts = computed(() => {
      // База: в дневнике — только личные записи, иначе все.
      let items = (posts.value || []).filter(post => {
        if (profileTab.value === 'diary') {
          return (post.visibility_mode || 'private') === 'private';
        }
        return true;
      });

      if (activeFilter.value === 'roots') {
        items = items.filter(post => !post.parent_id);
      } else if (activeFilter.value === 'replies') {
        items = items.filter(post => !!post.parent_id);
      }

      if (topicFilter.value !== 'all') {
        if (topicFilter.value === '__none__') {
          items = items.filter(post => !postTopic(post));
        } else {
          items = items.filter(post => postTopic(post) === topicFilter.value);
        }
      }

      if (dateFrom.value) {
        const from = new Date(dateFrom.value);
        from.setHours(0, 0, 0, 0);
        items = items.filter(post => {
          const created = new Date(post.created_at);
          return !Number.isNaN(created.getTime()) && created >= from;
        });
      }

      if (dateTo.value) {
        const to = new Date(dateTo.value);
        to.setHours(23, 59, 59, 999);
        items = items.filter(post => {
          const created = new Date(post.created_at);
          return !Number.isNaN(created.getTime()) && created <= to;
        });
      }

      return items;
    });

    function resetFilters() {
      activeFilter.value = 'all';
      topicFilter.value = 'all';
      dateFrom.value = '';
      dateTo.value = '';
    }

    const userInitial = computed(() => {
      const name = currentUser.value?.username || currentUser.value?.email || '';
      return name.trim().charAt(0).toUpperCase() || '?';
    });

    async function loadMyPosts() {
      loading.value = true;
      error.value = '';

      try {
        const data = await fetchFeed({ scope: 'mine' });
        const items = Array.isArray(data) ? data : (data.items || []);
        // Скрываем синтетический корневой узел аккаунта (type === 'user').
        posts.value = items.filter(item => item.type !== 'user');
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось загрузить ваши записи.';
      } finally {
        loading.value = false;
      }
    }

    async function removePost(postId) {
      const confirmed = await askConfirm({
        title: 'Удалить запись?',
        message: 'Запись будет удалена без возможности восстановления.',
        confirmText: 'Удалить',
      });
      if (!confirmed) return;

      deletingId.value = postId;

      try {
        await deletePost(postId);
        posts.value = posts.value.filter(post => post.id !== postId);
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось удалить запись.';
      } finally {
        deletingId.value = null;
      }
    }

    function openPost(postId) {
      openPostPage(postId);
    }

    // --- Редактирование записи ---
    const editingId = ref(null);
    const savingId = ref(null);
    const editError = ref('');
    const editForm = ref({
      display_name: '',
      title: '',
      text: '',
      topic: '',
      visibility_mode: 'private'
    });

    function startEdit(post) {
      editError.value = '';
      editingId.value = post.id;
      editForm.value = {
        display_name: post.display_name || '',
        title: post.title || post.content_json?.title || '',
        text: post.content_json?.text || post.excerpt || '',
        topic: postTopic(post),
        visibility_mode: post.visibility_mode || 'private'
      };
    }

    function cancelEdit() {
      editingId.value = null;
      savingId.value = null;
      editError.value = '';
    }

    async function saveEdit(post) {
      savingId.value = post.id;
      editError.value = '';

      const text = editForm.value.text.trim();
      const title = editForm.value.title.trim();
      const topic = editForm.value.topic.trim();
      const displayName = editForm.value.display_name.trim() || title || 'Запись';

      try {
        const updated = await updatePost(post.id, {
          display_name: displayName,
          visibility_mode: editForm.value.visibility_mode,
          content_json: {
            ...(post.content_json || {}),
            title,
            text,
            topic,
            excerpt: text.slice(0, 180)
          }
        });

        posts.value = posts.value.map(item =>
          item.id === post.id
            ? { ...item, ...updated, title, topic, excerpt: text.slice(0, 180) }
            : item
        );
        editingId.value = null;
      } catch (e) {
        console.error(e);
        editError.value = e.message || 'Не удалось сохранить изменения.';
      } finally {
        savingId.value = null;
      }
    }

    // --- Создание записи (кнопка в дневнике) ---
    const showCreate = ref(false);
    const creating = ref(false);
    const createError = ref('');
    const newPost = ref({
      title: '',
      text: '',
      topic: '',
      visibility_mode: 'private'
    });

    function openCreate() {
      createError.value = '';
      newPost.value = { title: '', text: '', topic: '', visibility_mode: 'private' };
      showCreate.value = true;
    }

    function closeCreate() {
      showCreate.value = false;
    }

    async function submitCreate() {
      creating.value = true;
      createError.value = '';

      const text = newPost.value.text.trim();
      const title = newPost.value.title.trim();
      const topic = newPost.value.topic.trim();

      try {
        await createPost({
          type: 'post',
          display_name: title || 'Новая запись',
          visibility_mode: newPost.value.visibility_mode,
          status: 'active',
          parent_id: null,
          content_json: { title, text, topic, excerpt: text.slice(0, 180) }
        });

        showCreate.value = false;
        await loadMyPosts();
      } catch (e) {
        console.error(e);
        createError.value = e.message || 'Не удалось создать запись.';
      } finally {
        creating.value = false;
      }
    }

    // --- Редактирование профиля ---
    const profileForm = ref({ username: '', bio: '' });
    const profileSaving = ref(false);
    const profileError = ref('');
    const profileSaved = ref(false);

    async function loadProfile() {
      try {
        const data = await fetchProfile();
        profileForm.value = { username: data.username || '', bio: data.bio || '' };
      } catch (e) {
        console.error(e);
      }
    }

    async function saveProfile() {
      profileSaving.value = true;
      profileError.value = '';
      profileSaved.value = false;

      try {
        const updated = await updateProfile({
          username: profileForm.value.username.trim(),
          bio: profileForm.value.bio
        });
        profileForm.value = { username: updated.username, bio: updated.bio };
        if (currentUser.value) currentUser.value.username = updated.username;
        profileSaved.value = true;
      } catch (e) {
        console.error(e);
        profileError.value = e.message || 'Не удалось сохранить профиль.';
      } finally {
        profileSaving.value = false;
      }
    }

    function handleLogout() {
      logout();
    }

    // --- Удаление аккаунта (с подтверждением паролем) ---
    const showDeleteAccount = ref(false);
    const deletePassword = ref('');
    const deletingAccount = ref(false);
    const deleteAccountError = ref('');

    function openDeleteAccount() {
      deletePassword.value = '';
      deleteAccountError.value = '';
      showDeleteAccount.value = true;
    }

    function closeDeleteAccount() {
      showDeleteAccount.value = false;
    }

    async function confirmDeleteAccount() {
      if (!deletePassword.value) {
        deleteAccountError.value = 'Введите пароль для подтверждения.';
        return;
      }
      deletingAccount.value = true;
      deleteAccountError.value = '';
      try {
        await deleteAccount(deletePassword.value);
        clearAuth();
        window.location.href = './signup.html';
      } catch (e) {
        console.error(e);
        deleteAccountError.value = e.message || 'Не удалось удалить аккаунт.';
      } finally {
        deletingAccount.value = false;
      }
    }

    onMounted(async () => {
      const user = await requireAuth();
      if (!user) return;

      currentUser.value = user;
      await Promise.all([loadMyPosts(), loadProfile()]);
    });

    return {
      loading,
      error,
      currentUser,
      posts,
      activeFilter,
      deletingId,
      profileTab,
      totalPosts,
      totalRoots,
      totalReplies,
      totalPrivate,
      filteredPosts,
      userInitial,
      removePost,
      openPost,
      formatDate,
      visibilityLabel,
      handleLogout,
      topicFilter,
      dateFrom,
      dateTo,
      availableTopics,
      resetFilters,
      editingId,
      savingId,
      editError,
      editForm,
      startEdit,
      cancelEdit,
      saveEdit,
      showCreate,
      creating,
      createError,
      newPost,
      openCreate,
      closeCreate,
      submitCreate,
      profileForm,
      profileSaving,
      profileError,
      profileSaved,
      saveProfile,
      confirmState,
      resolveConfirm,
      showDeleteAccount,
      deletePassword,
      deletingAccount,
      deleteAccountError,
      openDeleteAccount,
      closeDeleteAccount,
      confirmDeleteAccount,
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

      <div v-if="showDeleteAccount" class="modal-backdrop" @click="closeDeleteAccount">
        <div class="modal-card confirm-card" @click.stop>
          <div class="section-head"><h3>Удалить аккаунт?</h3></div>
          <p class="confirm-message">
            Все ваши записи, друзья и избранное будут удалены безвозвратно.
            Введите пароль для подтверждения.
          </p>
          <div class="form-stack">
            <label>
              <span>Пароль</span>
              <input v-model="deletePassword" type="password" placeholder="Ваш пароль" @keyup.enter="confirmDeleteAccount" />
            </label>
            <p v-if="deleteAccountError" class="form-error">{{ deleteAccountError }}</p>
            <div class="modal-actions">
              <button type="button" class="ghost-btn" @click="closeDeleteAccount">Отмена</button>
              <button type="button" class="new-entry danger-solid" @click="confirmDeleteAccount" :disabled="deletingAccount">
                {{ deletingAccount ? 'Удаляем…' : 'Удалить навсегда' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showCreate" class="modal-backdrop" @click="closeCreate">
        <div class="modal-card" @click.stop>
          <div class="section-head"><h3>Новая запись</h3></div>
          <div class="form-stack">
            <label>
              <span>Заголовок</span>
              <input v-model="newPost.title" type="text" placeholder="О чём эта запись?" />
            </label>
            <label>
              <span>Топик</span>
              <input v-model="newPost.topic" type="text" placeholder="Например: дневник, идеи" />
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
              <span>Текст</span>
              <textarea v-model="newPost.text" rows="8" placeholder="Начни писать..."></textarea>
            </label>
            <p v-if="createError" class="form-error">{{ createError }}</p>
            <div class="modal-actions">
              <button type="button" class="ghost-btn" @click="closeCreate">Отмена</button>
              <button type="button" class="new-entry" @click="submitCreate" :disabled="creating">
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

        <a class="new-entry" href="./dashboard.html">К ленте</a>

        <section class="sidebar-block">
          <div class="block-title">Навигация</div>
          <nav class="nav-list">
            <a class="nav-link" href="./dashboard.html">
              <span class="nav-main"><span class="icon-wrap">⌂</span>Главная лента</span>
            </a>
            <a class="nav-link" href="./favorites.html">
              <span class="nav-main"><span class="icon-wrap">★</span>Избранное</span>
            </a>
            <a class="nav-link" href="./profile.html" aria-current="page">
              <span class="nav-main"><span class="icon-wrap">◌</span>Профиль</span>
            </a>
          </nav>
        </section>

        <section class="sidebar-block">
          <div class="block-title">Аккаунт</div>
          <button type="button" class="nav-link" @click="handleLogout">
            <span class="nav-main"><span class="icon-wrap">⏻</span>Выйти</span>
          </button>
        </section>
      </aside>

      <main class="main" id="main">
        <section class="main-topbar" aria-label="Шапка профиля">
          <div class="topbar-row">
            <div class="author-row">
              <div class="avatar" aria-hidden="true">{{ userInitial }}</div>
              <div class="author-meta">
                <h1 v-if="currentUser" class="author-name" style="font-size: 1.6rem;">
                  {{ currentUser.username }}
                </h1>
                <h1 v-else class="author-name" style="font-size: 1.6rem;">Профиль</h1>
                <span class="author-sub">
                  {{ currentUser ? currentUser.email : 'Загружаем данные…' }}
                </span>
              </div>
            </div>
            <div class="utility">
              <button type="button" class="ghost-btn" @click="handleLogout">Выйти</button>
            </div>
          </div>

          <div class="topbar-row">
            <div class="tab-bar" role="tablist" aria-label="Разделы профиля">
              <button class="tab-btn" role="tab" :aria-selected="profileTab === 'posts'" @click="profileTab = 'posts'">Все записи</button>
              <button class="tab-btn" role="tab" :aria-selected="profileTab === 'diary'" @click="profileTab = 'diary'">Дневник</button>
              <button class="tab-btn" role="tab" :aria-selected="profileTab === 'edit'" @click="profileTab = 'edit'">Редактировать профиль</button>
            </div>
          </div>

          <div class="topbar-row">
            <div class="meta-row">
              <span class="type-badge">Записей: {{ totalPosts }}</span>
              <span class="type-badge">Темы: {{ totalRoots }}</span>
              <span class="type-badge">Продолжения: {{ totalReplies }}</span>
              <span class="type-badge">Личные: {{ totalPrivate }}</span>
            </div>
          </div>
        </section>

        <!-- Вкладка: редактирование профиля -->
        <section v-if="profileTab === 'edit'" class="feed-wrapper" aria-label="Редактирование профиля">
          <div class="section-head">
            <h2>Редактирование профиля</h2>
            <span class="inline-hint">Имя видно другим, email менять нельзя.</span>
          </div>

          <div class="post-card form-stack">
            <label>
              <span>Имя пользователя</span>
              <input v-model="profileForm.username" type="text" placeholder="Как вас называть" />
            </label>
            <label>
              <span>Email</span>
              <input :value="currentUser ? currentUser.email : ''" type="text" disabled />
            </label>
            <label>
              <span>О себе</span>
              <textarea v-model="profileForm.bio" rows="5" placeholder="Пара слов о себе"></textarea>
            </label>

            <p v-if="profileError" class="form-error">{{ profileError }}</p>
            <p v-if="profileSaved" class="inline-hint">✓ Профиль сохранён.</p>

            <div class="modal-actions">
              <button type="button" class="new-entry" @click="saveProfile" :disabled="profileSaving">
                {{ profileSaving ? 'Сохраняем…' : 'Сохранить профиль' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Вкладки: все записи / дневник -->
        <section v-else class="feed-wrapper" aria-label="Записи">
          <div class="section-head">
            <h2>{{ profileTab === 'diary' ? 'Дневник' : 'Мои записи' }}</h2>
            <span class="inline-hint">
              {{ profileTab === 'diary' ? 'Личные записи, видимые только вам.' : 'Все записи под этим аккаунтом.' }}
            </span>
          </div>

          <div v-if="profileTab === 'diary'" class="feed-filters">
            <button type="button" class="new-entry" @click="openCreate">+ Создать запись</button>
          </div>

          <div v-if="loading" class="feed-list">
            <article class="post-card"><p class="post-excerpt">Загружаем записи…</p></article>
          </div>

          <div v-else-if="error" class="feed-list">
            <article class="post-card"><p class="post-excerpt">Ошибка: {{ error }}</p></article>
          </div>

          <div v-else-if="posts.length === 0" class="feed-list">
            <article class="post-card">
              <h3 class="post-title">Здесь пока пусто</h3>
              <p class="post-excerpt">Как только вы создадите запись, она появится в этом списке.</p>
            </article>
          </div>

          <template v-else>
            <div class="feed-filters">
              <button type="button" class="filter-chip" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">Все</button>
              <button type="button" class="filter-chip" :class="{ active: activeFilter === 'roots' }" @click="activeFilter = 'roots'">Темы</button>
              <button type="button" class="filter-chip" :class="{ active: activeFilter === 'replies' }" @click="activeFilter = 'replies'">Продолжения</button>
            </div>

            <div class="profile-filters">
              <label>
                <span>Топик</span>
                <select v-model="topicFilter">
                  <option value="all">Все топики</option>
                  <option v-for="topic in availableTopics" :key="topic" :value="topic">{{ topic }}</option>
                  <option value="__none__">Без топика</option>
                </select>
              </label>
              <label>
                <span>С даты</span>
                <input type="date" v-model="dateFrom" />
              </label>
              <label>
                <span>По дату</span>
                <input type="date" v-model="dateTo" />
              </label>
              <button type="button" class="ghost-btn" @click="resetFilters">Сбросить</button>
            </div>

            <div class="feed-list">
              <div v-if="filteredPosts.length === 0" class="post-panel-state">
                <p>Нет записей под выбранные фильтры.</p>
              </div>

              <article
                v-for="item in filteredPosts"
                :key="item.id"
                class="feed-card"
                style="cursor: default;"
              >
                <div class="section-head">
                  <span v-if="item.parent_id" class="chip">Продолжение</span>
                  <span class="muted-text">{{ formatDate(item.created_at) }}</span>
                </div>

                <template v-if="editingId !== item.id">
                  <h3 class="post-title" @click="openPost(item.id)" style="cursor: pointer;">
                    {{ item.title || item.content_json?.title || item.display_name || 'Запись без заголовка' }}
                  </h3>

                  <p class="post-excerpt">
                    {{ item.excerpt || item.preview || item.content_json?.text || '' }}
                  </p>

                  <div class="post-footer">
                    <div class="post-tags">
                      <span v-if="item.parent_id" class="tag">Ветка</span>
                      <span v-if="(item.topic || item.content_json?.topic)" class="tag">#{{ item.topic || item.content_json?.topic }}</span>
                      <span class="tag">{{ visibilityLabel(item.visibility_mode) }}</span>
                    </div>

                    <div class="post-tags">
                      <button type="button" class="ghost-btn" @click="openPost(item.id)">Читать →</button>
                      <button type="button" class="ghost-btn" @click="startEdit(item)">Редактировать</button>
                      <button type="button" class="ghost-btn danger-btn" @click="removePost(item.id)" :disabled="deletingId === item.id">
                        {{ deletingId === item.id ? 'Удаляем…' : 'Удалить' }}
                      </button>
                    </div>
                  </div>
                </template>

                <div v-else class="form-stack">
                  <label>
                    <span>Заголовок</span>
                    <input v-model="editForm.title" type="text" placeholder="Заголовок записи" />
                  </label>
                  <label>
                    <span>Короткое имя</span>
                    <input v-model="editForm.display_name" type="text" placeholder="Название карточки" />
                  </label>
                  <label>
                    <span>Топик</span>
                    <input v-model="editForm.topic" type="text" placeholder="Например: дневник, идеи" />
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
                    <textarea v-model="editForm.text" rows="6" placeholder="Обнови текст записи"></textarea>
                  </label>

                  <p v-if="editError" class="form-error">{{ editError }}</p>

                  <div class="modal-actions">
                    <button type="button" class="ghost-btn" @click="cancelEdit">Отмена</button>
                    <button type="button" class="new-entry" @click="saveEdit(item)" :disabled="savingId === item.id">
                      {{ savingId === item.id ? 'Сохраняем…' : 'Сохранить' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </template>
        </section>
      </main>

      <aside class="rightbar panel" aria-label="Правая колонка профиля">
        <section class="rightbar-card profile-card">
          <div class="block-title">Аккаунт</div>
          <p class="profile-bio" v-if="currentUser"><strong>{{ currentUser.username }}</strong></p>
          <p class="profile-bio" v-if="currentUser">{{ currentUser.email }}</p>
          <p class="profile-bio" v-if="profileForm.bio">{{ profileForm.bio }}</p>
        </section>

        <section class="rightbar-card">
          <div class="section-head"><h3>Сводка</h3></div>
          <p class="profile-bio">Всего записей: {{ totalPosts }}</p>
          <p class="profile-bio">Тем: {{ totalRoots }}</p>
          <p class="profile-bio">Продолжений: {{ totalReplies }}</p>
          <p class="profile-bio">Личных: {{ totalPrivate }}</p>
        </section>

        <section class="rightbar-card">
          <div class="section-head"><h3>Действия</h3></div>
          <a class="inline-btn" href="./dashboard.html">Перейти к ленте</a>
          <a class="inline-btn" href="./favorites.html">Избранное</a>
          <button type="button" class="inline-btn" @click="handleLogout">Выйти из аккаунта</button>
        </section>

        <section class="rightbar-card danger-zone">
          <div class="section-head"><h3>Опасная зона</h3></div>
          <p class="profile-bio">Удаление аккаунта необратимо: исчезнут все записи, друзья и избранное.</p>
          <button type="button" class="inline-btn danger-btn" @click="openDeleteAccount">Удалить аккаунт</button>
        </section>
      </aside>

      <div class="mobile-bottom-nav" aria-label="Нижняя навигация">
        <nav>
          <a class="mobile-tab" href="./dashboard.html">⌂<span>Лента</span></a>
          <a class="mobile-tab" href="./favorites.html">★<span>Избранное</span></a>
          <a class="mobile-tab active" href="./profile.html">◌<span>Профиль</span></a>
          <button class="mobile-tab" type="button" @click="handleLogout">⏻<span>Выйти</span></button>
        </nav>
      </div>
    </div>
  `
};

createApp(App).mount('#app');
