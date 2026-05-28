<template>
  <form @submit.prevent="handleSubmit" class="login-form">
    <h2>Login</h2>
    
    <div class="form-group">
      <label for="username">Username:</label>
      <input
        id="username"
        v-model="form.username"
        type="text"
        required
        placeholder="Enter your username"
      />
    </div>
    
    <div class="form-group">
      <label for="password">Password:</label>
      <input
        id="password"
        v-model="form.password"
        type="password"
        required
        placeholder="Enter your password"
      />
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <button type="submit" :disabled="loading" class="submit-btn">
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>
    
    <p class="register-link">
      Don't have an account? <router-link to="/register">Register here</router-link>
    </p>
  </form>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'LoginForm',
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      loading: false,
      error: null
    }
  },
  methods: {
    ...mapActions(['login']),
    
    async handleSubmit() {
      this.loading = true
      this.error = null
      
      try {
        const result = await this.login(this.form)
        if (result.success) {
          this.$router.push('/diary')
        } else {
          this.error = result.error
        }
      } catch (error) {
        this.error = 'An unexpected error occurred'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-form h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #2c3e50;
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

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.error-message {
  background-color: #e74c3c;
  color: white;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.submit-btn {
  width: 100%;
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.submit-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 1rem;
  color: #7f8c8d;
}

.register-link a {
  color: #3498db;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>