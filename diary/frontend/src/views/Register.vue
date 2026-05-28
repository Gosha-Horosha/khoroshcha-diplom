<template>
  <div class="register-view">
    <div class="auth-container">
      <div class="auth-header">
        <h1>Join Diary App</h1>
        <p>Create your account to start writing</p>
      </div>
      <RegisterForm />
    </div>
  </div>
</template>

<script>
import RegisterForm from '../components/RegisterForm.vue'

export default {
  name: 'RegisterView',
  components: {
    RegisterForm
  }
}
</script>

<style scoped>
.register-view {
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