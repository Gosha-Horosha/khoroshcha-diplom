<template>
  <div class="login-view">
    <div class="auth-container">
      <div class="auth-header">
        <h1>Welcome to Diary App</h1>
        <p>Sign in to access your personal diary</p>
      </div>
      <LoginForm />
    </div>
  </div>
</template>

<script>
import LoginForm from '../components/LoginForm.vue'

export default {
  name: 'LoginView',
  components: {
    LoginForm
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-container {
  width: 100%;
  max-width: 450px;
  padding: 2rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}

.auth-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 300;
}

.auth-header p {
  font-size: 1.1rem;
  opacity: 0.9;
}
</style>