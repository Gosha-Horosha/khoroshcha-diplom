import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeApp } from './utils/init'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize application
initializeApp().then(() => {
  app.mount('#app')
})

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err)
  console.info('Error info:', info)
}
