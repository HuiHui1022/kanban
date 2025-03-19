<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { ref, onMounted } from 'vue'

const authStore = useAuthStore()
const ready = ref(false)

onMounted(async () => {
  try {
    await authStore.checkAuth()
  } catch (error) {
    console.error('Auth initialization error:', error)
  } finally {
    ready.value = true
  }
})
</script>

<template>
  <RouterView v-if="ready" />
  <div v-else class="loading">
    <div class="loading-spinner"></div>
    <div>Loading...</div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Open Sans', 'Helvetica Neue', sans-serif;
  color: #172b4d;
  position: fixed;
  inset: 0;
}

#app {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.loading {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.5rem;
  color: #172b4d;
  background: #f4f5f7;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #dfe1e6;
  border-top-color: #0052cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
