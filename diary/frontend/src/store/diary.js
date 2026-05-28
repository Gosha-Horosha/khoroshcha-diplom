import { defineStore } from 'pinia'
import { diaryService } from '../services/api'

export const useDiaryStore = defineStore('diary', {
  state: () => ({
    entries: [],
    currentEntry: null,
    loading: false,
    error: null
  }),

  getters: {
    allEntries: (state) => state.entries,
    entryCount: (state) => state.entries.length,
    publicEntries: (state) => state.entries.filter(entry => entry.is_public)
  },

  actions: {
    async fetchEntries() {
      this.loading = true
      this.error = null
      
      try {
        const entries = await diaryService.getEntries()
        this.entries = entries
        return entries
      } catch (error) {
        this.error = error.response?.data?.detail || 'Failed to fetch entries'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchEntry(id) {
      this.loading = true
      this.error = null
      
      try {
        const entry = await diaryService.getEntry(id)
        this.currentEntry = entry
        return entry
      } catch (error) {
        this.error = error.response?.data?.detail || 'Failed to fetch entry'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createEntry(entryData) {
      this.loading = true
      this.error = null
      
      try {
        const newEntry = await diaryService.createEntry(entryData)
        this.entries.unshift(newEntry)
        return newEntry
      } catch (error) {
        this.error = error.response?.data?.detail || 'Failed to create entry'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateEntry(id, entryData) {
      this.loading = true
      this.error = null
      
      try {
        const updatedEntry = await diaryService.updateEntry(id, entryData)
        const index = this.entries.findIndex(entry => entry.id === id)
        if (index !== -1) {
          this.entries[index] = updatedEntry
        }
        if (this.currentEntry && this.currentEntry.id === id) {
          this.currentEntry = updatedEntry
        }
        return updatedEntry
      } catch (error) {
        this.error = error.response?.data?.detail || 'Failed to update entry'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteEntry(id) {
      this.loading = true
      this.error = null
      
      try {
        await diaryService.deleteEntry(id)
        this.entries = this.entries.filter(entry => entry.id !== id)
        if (this.currentEntry && this.currentEntry.id === id) {
          this.currentEntry = null
        }
      } catch (error) {
        this.error = error.response?.data?.detail || 'Failed to delete entry'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearCurrentEntry() {
      this.currentEntry = null
    },

    clearError() {
      this.error = null
    }
  }
})