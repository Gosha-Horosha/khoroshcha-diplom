// js/post/app.js — страница чтения одного поста.
import { createApp, ref, computed, onMounted } from 'vue';
import { requireAuth } from '../auth/session.js';
import { getPostById, getPostChildren, getPostThread } from '../dashboard/services/posts.js';
import {
  fetchFavoriteIds,
  addFavorite,
  removeFavorite
} from '../dashboard/services/favorites.js';
import { visibilityLabel, formatDate } from '../format.js';
import { openPostPage, readPostId } from '../nav.js';

const App = {
  setup() {
    const loading = ref(true);
    const error = ref('');
    const currentUser = ref(null);

    const post = ref(null);
    const parent = ref(null);
    const continuations = ref([]);
    const favoriteIds = ref(new Set());
    const favBusy = ref(false);

    // Вся ветка (плоский список) → дерево структуры справа.
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

    // id берём из sessionStorage (или из старой ?id=, очищая адрес).
    const postId = ref(readPostId());

    const isFavorited = computed(() =>
      post.value ? favoriteIds.value.has(post.value.id) : false
    );

    const bodyText = computed(() => {
      if (!post.value) return '';
      return (
        post.value.content_json?.text
        || post.value.excerpt
        || post.value.preview
        || ''
      );
    });

    const paragraphs = computed(() =>
      bodyText.value
        .split(/\n{2,}/)
        .map(block => block.trim())
        .filter(Boolean)
    );

    const title = computed(() => {
      if (!post.value) return 'Запись';
      return (
        post.value.title
        || post.value.content_json?.title
        || post.value.display_name
        || 'Запись без заголовка'
      );
    });

    async function loadPost(id) {
      loading.value = true;
      error.value = '';
      parent.value = null;
      continuations.value = [];
      threadItems.value = [];

      try {
        const [postData, children, favIds, thread] = await Promise.all([
          getPostById(id),
          getPostChildren(id),
          fetchFavoriteIds().catch(() => []),
          getPostThread(id).catch(() => ({ items: [] }))
        ]);

        post.value = postData;
        // Дочерние записи = продолжения этой записи.
        continuations.value = children;
        favoriteIds.value = new Set(favIds);
        threadItems.value = thread.items || [];

        // Если у записи есть родитель — подгрузим его для навигации назад.
        if (postData.parent_id) {
          parent.value = await getPostById(postData.parent_id).catch(() => null);
        }
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось загрузить запись.';
      } finally {
        loading.value = false;
      }
    }

    async function toggleFavorite() {
      if (!post.value || favBusy.value) return;

      favBusy.value = true;
      const id = post.value.id;
      const next = new Set(favoriteIds.value);

      try {
        if (isFavorited.value) {
          await removeFavorite(id);
          next.delete(id);
        } else {
          await addFavorite(id);
          next.add(id);
        }
        favoriteIds.value = next;
      } catch (e) {
        console.error(e);
        error.value = e.message || 'Не удалось обновить избранное.';
      } finally {
        favBusy.value = false;
      }
    }

    function openPost(id) {
      openPostPage(id);
    }

    function excerptOf(item) {
      return (
        item.content_json?.text
        || item.excerpt
        || item.preview
        || ''
      );
    }

    function titleOf(item) {
      return (
        item.title
        || item.content_json?.title
        || item.display_name
        || 'Запись'
      );
    }

    onMounted(async () => {
      const user = await requireAuth();
      if (!user) return;
      currentUser.value = user;

      if (!postId.value) {
        loading.value = false;
        error.value = 'Не указан идентификатор записи.';
        return;
      }

      await loadPost(postId.value);
    });

    return {
      loading,
      error,
      currentUser,
      post,
      parent,
      continuations,
      threadItems,
      threadTree,
      isFavorited,
      favBusy,
      paragraphs,
      title,
      visibilityLabel,
      formatDate,
      toggleFavorite,
      openPost,
      excerptOf,
      titleOf
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
        <a class="ghost-btn" href="./favorites.html">Избранное</a>
      </header>

      <main class="reader" id="main">
        <div v-if="loading" class="post-panel-state"><p>Загружаем запись…</p></div>

        <div v-else-if="error" class="post-panel-state"><p>{{ error }}</p></div>

        <template v-else-if="post">
          <div class="reader-layout">
            <div class="reader-main">
          <a
            v-if="parent"
            class="reader-parent-link"
            href="./post.html"
            @click.prevent="openPost(parent.id)"
          >← Начало: {{ titleOf(parent) }}</a>

          <article class="reader-article">
            <div class="reader-meta">
              <span class="chip">{{ visibilityLabel(post.visibility_mode) }}</span>
              <span v-if="post.topic" class="tag">#{{ post.topic }}</span>
              <span class="muted-text">{{ formatDate(post.created_at) }}</span>
            </div>

            <h1 class="reader-title">{{ title }}</h1>

            <div class="reader-body">
              <p v-for="(para, i) in paragraphs" :key="i">{{ para }}</p>
              <p v-if="!paragraphs.length" class="muted-text">Пустая запись.</p>
            </div>

            <div class="reader-actions">
              <button
                type="button"
                class="new-entry"
                :class="{ 'is-fav': isFavorited }"
                @click="toggleFavorite"
                :disabled="favBusy"
              >
                {{ isFavorited ? '★ В избранном' : '☆ В избранное' }}
              </button>
            </div>
          </article>

          <section class="reader-continuations">
            <div class="section-head">
              <h2>Продолжения</h2>
              <span class="muted-text">{{ continuations.length }}</span>
            </div>

            <p v-if="!continuations.length" class="muted-text">
              У этой записи пока нет продолжений.
            </p>

            <article
              v-for="item in continuations"
              :key="item.id"
              class="feed-card"
              @click="openPost(item.id)"
            >
              <div class="section-head">
                <span class="chip">Продолжение</span>
                <span class="muted-text">{{ formatDate(item.created_at) }}</span>
              </div>
              <h3 class="post-title">{{ titleOf(item) }}</h3>
              <p class="post-excerpt">{{ excerptOf(item) }}</p>
              <div class="post-tags">
                <span class="tag">{{ visibilityLabel(item.visibility_mode) }}</span>
                <span class="reader-cta">Читать продолжение →</span>
              </div>
            </article>
          </section>
            </div>

            <aside class="reader-thread" v-if="threadTree.length">
              <div class="section-head">
                <h2>Структура</h2>
                <span class="muted-text">{{ threadItems.length }}</span>
              </div>
              <div class="thread-tree">
                <thread-node
                  v-for="node in threadTree"
                  :key="node.id"
                  :node="node"
                  :selected-id="post.id"
                  @select="openPost"
                />
              </div>
            </aside>
          </div>
        </template>
      </main>
    </div>
  `
};

// Рекурсивный узел дерева структуры (клик — переход к чтению записи).
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
