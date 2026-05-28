<template>
  <div class="diary-entry-list">
    <div class="list-header">
      <h2>My Diary Entries</h2>
      <button @click="showCreateForm = true" class="btn-primary">
        Add New Entry
      </button>
    </div>
    
    <div v-if="loading" class="loading">Loading entries...</div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="!loading && entries.length === 0" class="empty-state">
      <p>No diary entries yet. Create your first entry!</p>
    </div>
    
    <div class="entries-grid">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="entry-card"
        @click="viewEntry(entry.id)"
      >
        <div class="entry-header">
          <h3>{{ entry.title }}</h3>
          <span class="public-badge" v-if="entry.is_public">Public</span>
        </div>
        <p class="entry-preview">{{ truncateContent(entry.content) }}</p>
        <div class="entry-footer">
          <span class="entry-date">{{ formatDate(entry.created_at) }}</span>
          <div class="entry-actions">
            <button @click.stop="editEntry(entry)" class="btn-edit">Edit</button>
            <button @click.stop="deleteEntry(entry.id)" class="btn-delete">Delete</button>
          </div>
        </div>
      </div>
    </div>
    
    <DiaryEntryForm
      v-if="showCreateForm || editingEntry"
      :entry="editingEntry"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import DiaryEntryForm from './DiaryEntryForm.vue'

export default {
  name: 'DiaryEntryList',
  components: {
    DiaryEntryForm
  },
  data() {
    return {
      showCreateForm: false,
      editingEntry: null
    }
  },
  computed: {
    ...mapState('diary', ['entries', 'loading', 'error'])
  },
  async mounted() {
    await this.fetchEntries()
  },
  methods: {
    ...mapActions('diary', ['fetchEntries', 'deleteEntry']),
    
    truncateContent(content) {
      return content.length > 150 ? content.substring(0, 150) + '...' : content
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    },
    
    viewEntry(id) {
      this.$router.push(`/diary/${id}`)
    },
    
    editEntry(entry) {
      this.editingEntry = entry
    },
    
    async handleSave(entryData) {
      try {
        if (this.editingEntry) {
          await this.$store.dispatch('diary/updateEntry', {
            id: this.editingEntry.id,
            ...entryData
          })
        } else {
          await this.$store.dispatch('diary/createEntry', entryData)
        }
        this.showCreateForm = false
        this.editingEntry = null
      } catch (error) {
        // Error handled by store
      }
    },
    
    handleCancel() {
      this.showCreateForm = false
      this.editingEntry = null
    }
  }
}
</script>

<style scoped>
.diary-entry-list {
  max-width: 1200px;
  margin: 0 auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.list-header h2 {
  color: #2c3e50;
}

.btn-primary {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.loading, .empty-state {
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

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.entry-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.entry-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.entry-header h3 {
  margin: 0;
  color: #2c3e50;
}

.public-badge {
  background-color: #27ae60;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.entry-preview {
  color: #7f8c8d;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.entry-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #95a5a6;
}

.entry-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit, .btn-delete {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
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
</style>