<template>
  <div class="diary-entry-view">
    <div v-if="loading" class="loading">Loading entry...</div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="entry" class="entry-container">
      <div class="entry-header">
        <button @click="$router.back()" class="back-btn">← Back</button>
        <div class="header-actions">
          <button @click="editEntry" class="btn-edit" v-if="isOwner">Edit</button>
          <button @click="deleteEntry" class="btn-delete" v-if="isOwner">Delete</button>
        </div>
      </div>
      
      <article class="entry-content">
        <header class="content-header">
          <h1>{{ entry.title }}</h1>
          <div class="entry-meta">
            <span class="date">{{ formatDate(entry.created_at) }}</span>
            <span class="public-badge" v-if="entry.is_public">Public</span>
            <span class="private-badge" v-else>Private</span>
          </div>
        </header>
        
        <div class="content-body">
          <p>{{ entry.content }}</p>
        </div>
      </article>
    </div>
    
    <DiaryEntryForm
      v-if="showEditForm"
      :entry="entry"
      @save="handleUpdate"
      @cancel="showEditForm = false"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import DiaryEntryForm from '../components/DiaryEntryForm.vue'

export default {
  name: 'DiaryEntryView',
  components: {
    DiaryEntryForm
  },
  data() {
    return {
      showEditForm: false
    }
  },
  computed: {
    ...mapState(['user']),
    ...mapState('diary', ['currentEntry', 'loading', 'error']),
    
    entry() {
      return this.currentEntry
    },
    
    isOwner() {
      return this.entry && this.user && this.entry.user_id === this.user.id
    }
  },
  async mounted() {
    const entryId = parseInt(this.$route.params.id)
    await this.fetchEntry(entryId)
  },
  methods: {
    ...mapActions('diary', ['fetchEntry', 'updateEntry', 'deleteEntry']),
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    editEntry() {
      this.showEditForm = true
    },
    
    async handleUpdate(entryData) {
      try {
        await this.updateEntry({
          id: this.entry.id,
          ...entryData
        })
        this.showEditForm = false
      } catch (error) {
        // Error handled by store
      }
    },
    
    async deleteEntry() {
      if (confirm('Are you sure you want to delete this entry?')) {
        try {
          await this.deleteEntry(this.entry.id)
          this.$router.push('/diary')
        } catch (error) {
          // Error handled by store
        }
      }
    }
  }
}
</script>

<style scoped>
.diary-entry-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.error-message {
  background-color: #e74c3c;
  color: white;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.back-btn {
  background: none;
  border: 1px solid #bdc3c7;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  color: #34495e;
}

.back-btn:hover {
  background-color: #ecf0f1;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit, .btn-delete {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-edit {
  background-color: #f39c12;
  color: white;
}

.btn-edit:hover {
  background-color: #e67e22;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
}

.btn-delete:hover {
  background-color: #c0392b;
}

.entry-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.content-header {
  border-bottom: 1px solid #ecf0f1;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}

.content-header h1 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 2rem;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.public-badge, .private-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.public-badge {
  background-color: #27ae60;
  color: white;
}

.private-badge {
  background-color: #95a5a6;
  color: white;
}

.content-body {
  line-height: 1.6;
  color: #34495e;
}

.content-body p {
  white-space: pre-wrap;
  font-size: 1.1rem;
}
</style>