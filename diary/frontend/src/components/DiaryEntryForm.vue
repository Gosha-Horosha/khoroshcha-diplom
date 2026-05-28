<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <h3>{{ isEditing ? 'Edit Entry' : 'Create New Entry' }}</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="title">Title:</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            required
            placeholder="Enter entry title"
          />
        </div>
        
        <div class="form-group">
          <label for="content">Content:</label>
          <textarea
            id="content"
            v-model="form.content"
            required
            placeholder="Write your diary entry..."
            rows="8"
          ></textarea>
        </div>
        
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              v-model="form.is_public"
              type="checkbox"
            />
            Make this entry public
          </label>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-actions">
          <button type="button" @click="$emit('cancel')" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" :disabled="loading" class="btn-primary">
            {{ loading ? 'Saving...' : isEditing ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'DiaryEntryForm',
  props: {
    entry: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      form: {
        title: '',
        content: '',
        is_public: false
      },
      loading: false,
      error: null
    }
  },
  computed: {
    ...mapState('diary', ['loading']),
    isEditing() {
      return !!this.entry
    }
  },
  watch: {
    entry: {
      immediate: true,
      handler(newEntry) {
        if (newEntry) {
          this.form = {
            title: newEntry.title,
            content: newEntry.content,
            is_public: newEntry.is_public
          }
        } else {
          this.form = {
            title: '',
            content: '',
            is_public: false
          }
        }
      }
    }
  },
  methods: {
    async handleSubmit() {
      this.loading = true
      this.error = null
      
      try {
        this.$emit('save', this.form)
      } catch (error) {
        this.error = 'Failed to save entry'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-bottom: 2rem;
  color: #2c3e50;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #34495e;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input {
  width: auto;
  margin-right: 0.5rem;
}

.error-message {
  background-color: #e74c3c;
  color: white;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
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

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}
</style>