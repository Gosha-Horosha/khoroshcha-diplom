import axios from 'axios'

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Добавляем интерцептор для автоматической прикрепления токена
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Сервис аутентификации
export const authService = {
  async login(credentials) {
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    
    const response = await apiClient.post('/auth/token', formData)
    return response.data
  },

  async register(userData) {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me')
    return response.data
  }
}

// Сервис работы с дневником
export const diaryService = {
  async getEntries(params = {}) {
    const response = await apiClient.get('/diary/', { params })
    return response.data
  },

  async getEntry(id) {
    const response = await apiClient.get(`/diary/${id}`)
    return response.data
  },

  async createEntry(entryData) {
    const response = await apiClient.post('/diary/', entryData)
    return response.data
  },

  async updateEntry(id, entryData) {
    const response = await apiClient.put(`/diary/${id}`, entryData)
    return response.data
  },

  async deleteEntry(id) {
    const response = await apiClient.delete(`/diary/${id}`)
    return response.data
  }
}

// Сервис управления разрешениями
export const permissionService = {
  async getPermissions() {
    const response = await apiClient.get('/permissions/')
    return response.data
  },

  async createPermission(permissionData) {
    const response = await apiClient.post('/permissions/', permissionData)
    return response.data
  },

  async deletePermission(id) {
    const response = await apiClient.delete(`/permissions/${id}`)
    return response.data
  }
}

export default apiClient