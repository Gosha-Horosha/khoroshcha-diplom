// Application initialization utilities

import { useAuthStore } from '../store/auth'

export const initializeApp = async () => {
  const authStore = useAuthStore()
  
  try {
    // Initialize authentication state
    await authStore.initialize()
    
    console.log('Application initialized successfully')
  } catch (error) {
    console.error('Error initializing application:', error)
  }
}

export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status
    const message = error.response.data?.detail || 'An error occurred'
    
    switch (status) {
      case 401:
        return 'Authentication required. Please log in again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 500:
        return 'Server error. Please try again later.'
      default:
        return message
    }
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection.'
  } else {
    // Something else happened
    return 'An unexpected error occurred.'
  }
}

export const formatValidationErrors = (errors) => {
  if (typeof errors === 'string') {
    return errors
  }
  
  if (Array.isArray(errors)) {
    return errors.join(', ')
  }
  
  if (typeof errors === 'object') {
    return Object.values(errors).join(', ')
  }
  
  return 'Validation error'
}

export default {
  initializeApp,
  handleApiError,
  formatValidationErrors
}