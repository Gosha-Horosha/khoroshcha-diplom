// js/favorites/app.js — страница избранных записей.
import { createApp, ref, onMounted } from 'vue';
import { requireAuth } from '../auth/session.js';
import { fetchFavorites, removeFavorite } from '../dashboard/services/favorites.js';
import { visibilityLabel, formatDate } from '../format.js';
import { openPostPage } from '../nav.js';

const App = {
  setup() {
    const loading = ref(true);
    const error = ref('');
    const currentUser = ref(null);
    const items = ref([]);
    const removingId = ref(null);

    async function loadFavorites() {
      loading.value = true;
      error.value = '';

      try {
        items.value = await fetchFavorites();
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось загрузить избранное.';
      } finally {
        loading.value = false;
      }
    }

    async function remove(postId) {
      removingId.value = postId;
      try {
        await removeFavorite(postId);
        items.value = items.value.filter(item => item.id !== postId);
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось убрать из избранного.';
      } finally {
        removingId.value = null;
      }
    }

    function openPost(id) {
      openPostPage(id);
    }

    function titleOf(item) {
      return item.title || item.content_json?.title || item.display_name || 'Запись';
    }

    function excerptOf(item) {
      return item.content_json?.text || item.excerpt || item.preview || '';
    }

    onMounted(async () => {
      const user = await requireAuth();
      if (!user) return;
      currentUser.value = user;
      await loadFavorites();
    });

    return {
      loading,
      error,
      currentUser,
      items,
      removingId,
      remove,
      openPost,
      titleOf,
      excerptOf,
      visibilityLabel,
      formatDate
    };
  },

  template: `
    <div class="reader-shell">
      <header class="reader-topbar">
        <a class="ghost-btn" href="./dashboard.html">← К ленте</a>
        <div class="reader-brand">
          <span class="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"></path>
              <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"></path>
            </svg>
          </span>
          Archive
        </div>
        <a class="ghost-btn" href="./profile.html">Профиль</a>
      </header>

      <main class="reader" id="main">
        <div class="section-head">
          <h1 class="reader-title" style="font-size: 1.7rem;">Избранное</h1>
          <span class="inline-hint">Записи, которые вы сохранили для себя.</span>
        </div>

        <div v-if="loading" class="post-panel-state"><p>Загружаем избранное…</p></div>

        <div v-else-if="error" class="post-panel-state"><p>{{ error }}</p></div>

        <div v-else-if="!items.length" class="post-panel-state">
          <p>Здесь пока пусто. Откройте запись и нажмите «☆ В избранное».</p>
        </div>

        <div v-else class="feed-list">
          <article
            v-for="item in items"
            :key="item.id"
            class="feed-card"
          >
            <div class="section-head" @click="openPost(item.id)" style="cursor: pointer;">
              <span class="chip">{{ visibilityLabel(item.visibility_mode) }}</span>
              <span class="muted-text">{{ formatDate(item.created_at) }}</span>
            </div>

            <h3 class="post-title" @click="openPost(item.id)" style="cursor: pointer;">
              {{ titleOf(item) }}
            </h3>

            <p class="post-excerpt" @click="openPost(item.id)" style="cursor: pointer;">
              {{ excerptOf(item) }}
            </p>

            <div class="post-footer">
              <div class="post-tags">
                <span v-if="item.topic" class="tag">#{{ item.topic }}</span>
                <span v-if="item.is_mine" class="tag">Моё</span>
              </div>

              <button
                type="button"
                class="ghost-btn danger-btn"
                @click="remove(item.id)"
                :disabled="removingId === item.id"
              >
                {{ removingId === item.id ? 'Убираем…' : 'Убрать' }}
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>
  `
};

createApp(App).mount('#app');
