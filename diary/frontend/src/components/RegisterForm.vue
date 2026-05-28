<template>
  <form @submit.prevent="handleSubmit" class="register-form">
    <h2>Register</h2>
    
    <div class="form-group">
      <label for="username">Username:</label>
      <input
        id="username"
        v-model="form.username"
        type="text"
        required
        placeholder="Choose a username"
      />
    </div>
    
    <div class="form-group">
      <label for="email">Email:</label>
      <input
        id="email"
        v-model="form.email"
        type="email"
        required
        placeholder="Enter your email"
      />
    </div>
    
    <div class="form-group">
      <label for="password">Password:</label>
      <input
        id="password"
        v-model="form.password"
        type="password"
        required
        placeholder="Choose a password"
      />
    </div>
    
    <div class="form-group">
      <label for="confirmPassword">Confirm Password:</label>
      <input
        id="confirmPassword"
        v-model="form.confirmPassword"
        type="password"
        required
        placeholder="Confirm your password"
      />
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="passwordError" class="error-message">
      {{ passwordError }}
    </div>
    
    <button type="submit" :disabled="loading || passwordError" class="submit-btn">
      {{ loading ? 'Registering...' : 'Register' }}
    </button>
    
    <p class="login-link">
      Already have an account? <router-link to="/login">Login here</router-link>
    </p>
  </form>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'RegisterForm',
  data() {
    return {
      form: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      loading: false,
      error: null
    }
  },
  computed: {
    passwordError() {
      if (this.form.password && this.form.confirmPassword) {
        if (this.form.password !== this.form.confirmPassword) {
          return 'Passwords do not match'
        }
        if (this.form.password.length < 8) {
          return 'Password must be at least 8 characters long'
        }
      }
      return null
    }
  },
  methods: {
    ...mapActions(['register']),
    
    async handleSubmit() {
      if (this.passwordError) return
      
      this.loading = true
      this.error = null
      
      try {
        const result = await this.register({
          username: this.form.username,
          email: this.form.email,
          password: this.form.password
        })
        
        if (result.success) {
          this.$router.push('/login')
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
.register-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.register-form h2 {
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
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #229954;
}

.submit-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.login-link {
  text-align: center;
  margin-top: 1rem;
  color: #7f8c8d;
}

.login-link a {
  color: #3498db;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>