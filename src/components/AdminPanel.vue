<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useUsersStore } from '../stores/users'
import { api } from '../services/api'
import ApiTokens from './ApiTokens.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'message', text: string, type: 'success' | 'error'): void
  (e: 'fileImport', event: Event): void
}>()

const usersStore = useUsersStore()
const importText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const allowSignup = ref(true)
const loading = ref(false)
const activeSection = ref('general')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

type Section = 'general' | 'import' | 'export' | 'tokens'

const sections: { id: Section; title: string; icon: string }[] = [
  { id: 'general', title: 'General Settings', icon: '⚙️' },
  { id: 'import', title: 'Import Data', icon: '📥' },
  { id: 'export', title: 'Export Data', icon: '📤' },
  { id: 'tokens', title: 'API Tokens', icon: '🔑' },
]

// Load settings on mount
onMounted(async () => {
  try {
    loading.value = true
    const settings = await usersStore.getSettings()
    allowSignup.value = settings.allowSignup
  } catch (err) {
    console.error('Failed to load settings:', err)
    emit('message', 'Failed to load settings', 'error')
  } finally {
    loading.value = false
  }
})

const handleExport = async () => {
  try {
    const data = await api.get('/admin/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanban-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    emit('message', 'Data exported successfully', 'success')
  } catch (error) {
    console.error('Failed to export data:', error)
    emit('message', 'Failed to export data', 'error')
  }
}

const handleImport = async () => {
  if (!importText.value.trim()) {
    emit('message', 'Please paste data to import', 'error')
    return
  }

  try {
    const data = JSON.parse(importText.value)
    await api.post('/admin/import', data)
    emit('message', 'Data imported successfully. Refreshing...', 'success')
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error) {
    console.error('Failed to import data:', error)
    emit('message', 'Invalid data format', 'error')
  }
}

const updateSettings = async () => {
  try {
    loading.value = true
    await usersStore.updateSettings({ allowSignup: allowSignup.value })
    emit('message', 'Settings updated successfully', 'success')
  } catch (error) {
    console.error('Failed to update settings:', error)
    emit('message', 'Failed to update settings', 'error')
  } finally {
    loading.value = false
  }
}

const setActiveSection = (section: Section) => {
  activeSection.value = section
}

// Add a watch to clear message after some time
watch(message, (newMessage) => {
  if (newMessage) {
    setTimeout(() => {
      message.value = ''
    }, 3000)
  }
})

// Update the message when emitting
const showMessage = (text: string, type: 'success' | 'error') => {
  message.value = text
  messageType.value = type
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="emit('close')">
    <div class="admin-layout" @click.stop>
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="section in sections"
            :key="section.id"
            class="nav-item"
            :class="{ active: activeSection === section.id }"
            @click="setActiveSection(section.id)"
          >
            <span class="icon">{{ section.icon }}</span>
            {{ section.title }}
          </button>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- General Settings -->
        <div v-if="activeSection === 'general'" class="content-section">
          <h2>General Settings</h2>
          <div class="card">
            <form @submit.prevent="updateSettings" class="settings-form">
              <label class="setting-item">
                <span class="setting-label">Allow New User Signups</span>
                <div class="setting-control">
                  <input type="checkbox" v-model="allowSignup" :disabled="loading" />
                </div>
              </label>
              <button type="submit" :disabled="loading" class="primary-button">
                {{ loading ? 'Saving...' : 'Save Settings' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Import Section -->
        <div v-if="activeSection === 'import'" class="content-section">
          <h2>Import Data</h2>
          <div class="card">
            <p class="description">Import your backup data by uploading a JSON file or pasting below</p>
            <div class="import-form">
              <div class="file-import">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".json"
                  class="file-input"
                  @change="$emit('fileImport', $event)"
                  :disabled="loading"
                />
                <button
                  class="primary-button"
                  @click="fileInput?.click()"
                  :disabled="loading"
                >
                  <span v-if="loading" class="loading-spinner"></span>
                  <span v-else>Choose File</span>
                </button>
              </div>
              <div v-if="message" :class="['import-message', messageType]">
                {{ message }}
              </div>
              <div class="text-divider">Or paste JSON data here:</div>
              <textarea
                v-model="importText"
                placeholder="Paste JSON data here..."
                rows="10"
                class="import-textarea"
                :disabled="loading"
              ></textarea>
              <button @click="handleImport" class="primary-button" :disabled="loading">
                {{ loading ? 'Importing...' : 'Import from Text' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Export Section -->
        <div v-if="activeSection === 'export'" class="content-section">
          <h2>Export Data</h2>
          <div class="card">
            <p class="description">Download your complete kanban board data as a JSON file</p>
            <button @click="handleExport" class="primary-button">Export Data</button>
          </div>
        </div>

        <!-- API Tokens Section -->
        <div v-if="activeSection === 'tokens'" class="content-section">
          <h2>API Tokens</h2>
          <div class="card">
            <p class="description">Manage your API tokens for programmatic access to the Kanban API</p>
            <div class="tokens-wrapper">
              <ApiTokens />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.admin-layout {
  display: flex;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  background: var(--color-background-light);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-header h2 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin: 0;
}

.sidebar-nav {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: var(--font-size-md);
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--color-hover-overlay);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-primary);
  color: white;
}

.icon {
  font-size: 1.2em;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: white;
}

.content-section {
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  color: var(--color-text-primary);
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
}

.card {
  background: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 4px var(--color-shadow);
  padding: 1.5rem;
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  color: var(--color-text-primary);
  font-weight: 500;
}

.setting-control input[type='checkbox'] {
  width: 1.2rem;
  height: 1.2rem;
}

.import-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-import {
  position: relative;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.text-divider {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 1rem 0;
  font-size: 0.9em;
}

.import-textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  font-family: monospace;
  resize: vertical;
  min-height: 200px;
}

.import-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.primary-button {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.primary-button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.tokens-wrapper {
  max-width: 100%;
}

.tokens-wrapper :deep(.api-tokens) {
  padding: 0;
  max-width: none;
  background: none;
  box-shadow: none;
}

.tokens-wrapper :deep(.token-list) {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  margin-top: 1rem;
  background: var(--color-background-light);
}

.tokens-wrapper :deep(.token-item) {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  background: white;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tokens-wrapper :deep(.token-item:last-child) {
  border-bottom: none;
}

.tokens-wrapper :deep(.token-name) {
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
}

.tokens-wrapper :deep(.token-info) {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.tokens-wrapper :deep(.create-token-button) {
  composes: primary-button;
  margin-top: 1rem;
}

.tokens-wrapper :deep(.token-actions) {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tokens-wrapper :deep(.token-actions button) {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-background-light);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.tokens-wrapper :deep(.token-actions button:hover) {
  background: var(--color-hover-overlay);
  color: var(--color-text-primary);
}

.tokens-wrapper :deep(.token-actions .delete-button) {
  color: var(--color-error);
  border-color: var(--color-error);
}

.tokens-wrapper :deep(.token-actions .delete-button:hover) {
  background: var(--color-error);
  color: white;
}

.tokens-wrapper :deep(.token-value) {
  font-family: monospace;
  padding: 0.75rem;
  background: var(--color-background-light);
  border-radius: var(--border-radius-sm);
  word-break: break-all;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.card {
  background: white;
  border-radius: var(--border-radius-md);
  padding: 1.5rem;
}

.import-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.import-message {
  padding: 0.75rem;
  border-radius: var(--border-radius-sm);
  text-align: center;
  margin-top: 0.5rem;
}

.import-message.success {
  background: var(--color-success);
  color: white;
}

.import-message.error {
  background: var(--color-error);
  color: white;
}
</style>
