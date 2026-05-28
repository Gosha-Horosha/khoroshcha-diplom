import { defineStore } from 'pinia'
import { authService } from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token')
  }),

  getters: {
    currentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated
  },

  actions: {
    async login(credentials) {
      try {
        const response = await authService.login(credentials)
        this.token = response.access_token
        this.isAuthenticated = true
        localStorage.setItem('token', response.access_token)
        
        // Получаем информацию о пользователе
        await this.fetchUser()
        
        return { success: true }
      } catch (error) {
        return { success: false, error: error.response?.data?.detail || 'Login failed' }
      }
    },

    async register(userData) {
      try {
        await authService.register(userData)
        return { success: true }
      } catch (error) {
        return { success: false, error: error.response?.data?.detail || 'Registration failed' }
      }
    },

    async fetchUser() {
      try {
        const user = await authService.getCurrentUser()
        this.user = user
        return user
      } catch (error) {
        this.logout()
        throw error
      }
    },

    logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
    },

    initialize() {
      if (this.token) {
        this.fetchUser().catch(() => {
          this.logout()
        })
      }
    }
  }
})