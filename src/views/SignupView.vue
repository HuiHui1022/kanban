<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUsersStore } from '../stores/users'
import { api } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()
const usersStore = useUsersStore()
const loading = ref(false)
const error = ref('')
const signupAllowed = ref(true)
const isFirstUser = ref(false)

const username = ref('')
const password = ref('')
const displayName = ref('')

// Check if signup is allowed
onMounted(async () => {
  try {
    loading.value = true
    const settings = await usersStore.getSettings()
    signupAllowed.value = settings.allowSignup

    // Get user count to check if this is the first user
    const { count } = await api.get<{ count: number }>('/users/count')
    isFirstUser.value = count === 0
  } catch (err) {
    console.error('Failed to check signup settings:', err)
    error.value = 'Failed to check signup settings'
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  if (!signupAllowed.value && !isFirstUser.value) {
    error.value = 'New user registration is currently disabled'
    return
  }

  if (!username.value || !password.value || !displayName.value) {
    error.value = 'All fields are required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.signup({
      username: username.value,
      password: password.value,
      displayName: displayName.value,
    })
    router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to register'
  } finally {
    loading.value = false
  }
}

const isSignupDisabled = computed(() => {
  return !signupAllowed.value && !isFirstUser.value
})
</script>

<template>
  <div v-if="loading" class="loading">Loading...</div>
  <div class="signup">
    <form @submit.prevent="handleSubmit">
      <h1>Sign Up</h1>

      <!-- Show warning banner when signup is disabled -->
      <div v-if="isSignupDisabled" class="signup-warning">
        <p>⚠️ New user registration is currently disabled by the administrator.</p>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="username"
          type="text"
          required
          :disabled="loading || isSignupDisabled"
          placeholder="Enter username"
        />
      </div>
      <div class="form-group">
        <label for="displayName">Display Name</label>
        <input
          id="displayName"
          v-model="displayName"
          type="text"
          required
          :disabled="loading || isSignupDisabled"
          placeholder="Enter display name"
        />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          :disabled="loading || isSignupDisabled"
          placeholder="Enter password"
        />
      </div>
      <button type="submit" :disabled="loading || isSignupDisabled">
        {{ loading ? 'Signing up...' : 'Sign Up' }}
      </button>
      <div class="links">
        <router-link to="/login">Already have an account? Log in</router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.signup {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-background-light);
}

form {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-md);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 2px 4px var(--color-shadow);
}

h1 {
  margin: 0 0 1.5rem;
  color: var(--color-text-primary);
  text-align: center;
}

.error {
  background: var(--color-error);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

button {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
}

button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.links {
  margin-top: 1rem;
  text-align: center;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.signup-disabled {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
  background: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 4px var(--color-shadow);
}

.signup-disabled h2 {
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

.signup-disabled p {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.login-link {
  color: var(--color-primary);
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.signup-warning {
  background: var(--color-error);
  color: white;
  padding: 1rem;
  border-radius: var(--border-radius-sm);
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
}

.signup-warning p {
  margin: 0;
}

input:disabled {
  background-color: var(--color-background-light);
  cursor: not-allowed;
  opacity: 0.7;
}

button:disabled {
  background-color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.7;
}

button:disabled:hover {
  background-color: var(--color-text-secondary);
}
</style>
