<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useKanbanStore } from '../stores/kanban'
import TaskColumn from '../components/TaskColumn.vue'
import ProjectSelector from '../components/ProjectSelector.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import { api } from '../services/api'
import ApiTokens from '../components/ApiTokens.vue'
import AdminPanel from '../components/AdminPanel.vue'

defineOptions({
  name: 'KanbanView',
})

const store = useKanbanStore()
const router = useRouter()
const showAddColumn = ref(false)
const showAdminPanel = ref(false)
const importText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const usersStore = useUsersStore()
const newColumnTitle = ref('')
const showErrorModal = ref(false)
const errorMessage = ref('')
const adminMessage = ref('')
const adminMessageType = ref<'success' | 'error'>('success')
const allowSignup = ref(true)
const adminLoading = ref(false)

const activeColumns = computed(() => {
  if (!store.activeProjectId) return []
  return store.columns
    .filter((c) => c.project_id === store.activeProjectId)
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
})

const columnTasks = (columnId: string) =>
  store.tasks
    .filter((t) => t.column_id === columnId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((task) => ({
      ...task,
      columnId: task.column_id,
      createdAt: task.created_at || new Date().toISOString(),
      updatedAt: task.updated_at || new Date().toISOString(),
    }))

async function handleAddColumn() {
  if (newColumnTitle.value.trim() && store.activeProjectId) {
    try {
      const column = await store.addColumn(store.activeProjectId, newColumnTitle.value.trim())
      if (column) {
        await store.setActiveProject(store.activeProjectId)
      }
      newColumnTitle.value = ''
      showAddColumn.value = false
    } catch (error) {
      if ((error as Error).message === 'Unauthorized') {
        errorMessage.value = 'Your session has expired. Please log in again.'
        showErrorModal.value = true
      } else {
        errorMessage.value = 'Failed to add column. Please try again.'
        showErrorModal.value = true
      }
    }
  }
}

const cancelAddColumn = () => {
  showAddColumn.value = false
  newColumnTitle.value = ''
}

// Load initial data
onMounted(async () => {
  try {
    await store.loadUserData()

    // Check for import success flag
    if (localStorage.getItem('importSuccess')) {
      localStorage.removeItem('importSuccess')
      showAdminMessage('Import successful!', 'success')
    }
  } catch (error) {
    console.error('Failed to load user data:', error)
    if ((error as Error).message === 'Unauthorized') {
      router.push('/login')
    }
  }
})

// Admin panel functions
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

    showAdminMessage('Data exported successfully', 'success')
  } catch (error) {
    console.error('Export error:', error)
    showAdminMessage('Failed to export data', 'error')
  }
}

const handleImport = async () => {
  if (!importText.value.trim()) {
    showAdminMessage('Please paste data to import', 'error')
    return
  }

  try {
    adminLoading.value = true
    const data = JSON.parse(importText.value)

    // More thorough data validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: must be a JSON object')
    }

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid data format: missing or invalid projects array')
    }

    if (data.columns && !Array.isArray(data.columns)) {
      throw new Error('Invalid data format: columns must be an array')
    }

    if (data.tasks && !Array.isArray(data.tasks)) {
      throw new Error('Invalid data format: tasks must be an array')
    }

    await api.post('/admin/import', data)
    showAdminMessage('Data imported successfully. Refreshing...', 'success')
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error) {
    console.error('Import error:', error)
    showAdminMessage(
      error instanceof Error
        ? `Import failed: ${error.message}`
        : 'Failed to import data: Invalid format',
      'error',
    )
  } finally {
    adminLoading.value = false
    importText.value = ''
  }
}

const updateSettings = async () => {
  try {
    adminLoading.value = true
    await usersStore.updateSettings({ allowSignup: allowSignup.value })
    showAdminMessage('Settings updated successfully', 'success')
  } catch (error) {
    console.error('Failed to update settings:', error)
    showAdminMessage('Failed to update settings', 'error')
  } finally {
    adminLoading.value = false
  }
}

const showAdminMessage = (text: string, type: 'success' | 'error', duration?: number) => {
  adminMessage.value = text
  adminMessageType.value = type
  if (duration !== undefined) {
    setTimeout(() => {
      adminMessage.value = ''
    }, duration)
  }
}

const openAdminPanel = async () => {
  try {
    adminLoading.value = true
    const settings = await usersStore.getSettings()
    allowSignup.value = settings.allowSignup
    showAdminPanel.value = true
  } catch (error) {
    console.error('Failed to load settings:', error)
    showAdminMessage('Failed to load settings', 'error')
  } finally {
    adminLoading.value = false
  }
}

// Add file import function
const handleFileImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  try {
    adminLoading.value = true
    const file = input.files[0]
    const text = await file.text()
    const data = JSON.parse(text)

    // More thorough data validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: must be a JSON object')
    }

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid data format: missing or invalid projects array')
    }

    await api.post('/admin/import', data)

    // 1. Close admin panel immediately
    showAdminPanel.value = false

    // 2. Refresh the page
    window.location.reload()
  } catch (error) {
    console.error('Import error:', error)
    showAdminMessage(
      error instanceof Error
        ? `Import failed: ${error.message}`
        : 'Failed to import data: Invalid format',
      'error',
    )
  } finally {
    adminLoading.value = false
    // Reset the file input
    const fileInput = event.target as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }
}
</script>

<template>
  <div class="kanban">
    <ProjectSelector @openAdmin="openAdminPanel" />
    <div class="main-content">
      <div v-if="store.activeProjectId" class="board">
        <TaskColumn
          v-for="(column, index) in activeColumns"
          :key="column.id"
          :column="column"
          :tasks="columnTasks(column.id)"
          :column-index="index"
        />
        <div class="add-column" :class="{ adding: showAddColumn }">
          <div v-if="showAddColumn" class="add-column-form">
            <input
              v-model="newColumnTitle"
              placeholder="Enter column title..."
              @keyup.enter="handleAddColumn"
              @keyup.esc="cancelAddColumn"
              class="column-input"
            />
            <div class="form-actions">
              <button class="save-button" @click="handleAddColumn">Save</button>
              <button class="cancel-button" @click="cancelAddColumn">Cancel</button>
            </div>
          </div>
          <div v-else class="column-header">
            <button class="icon-button" @click="showAddColumn = true" title="Add Column">
              <span class="icon">+</span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="no-project">
        <h2>Select or create a project to get started</h2>
      </div>
    </div>
  </div>

  <ConfirmModal
    :show="showErrorModal"
    title="Error"
    :message="errorMessage"
    @confirm="
      () => {
        showErrorModal = false
        if (errorMessage.includes('session has expired')) {
          router.push('/login')
        }
      }
    "
    @cancel="showErrorModal = false"
  />

  <AdminPanel
    :show="showAdminPanel"
    @close="showAdminPanel = false"
    @message="showAdminMessage"
    @fileImport="handleFileImport"
  />
</template>

<style scoped>
.kanban {
  height: 100vh;
  display: flex;
  background: #f4f5f7;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 2rem;
  scroll-behavior: smooth;
}

.board {
  height: 100%;
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  width: 100%;
}

.board::-webkit-scrollbar {
  height: 12px;
}

.board::-webkit-scrollbar-track {
  background: var(--color-background-light);
  border-radius: 6px;
}

.board::-webkit-scrollbar-thumb {
  background: var(--color-text-secondary);
  border-radius: 6px;
  border: 3px solid var(--color-background-light);
}

.board::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-primary);
}

.add-column {
  background: var(--color-background-light);
  border-radius: var(--border-radius-md);
  width: 46px;
  min-width: 46px;
  flex: 0 0 46px;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  margin: 0.5rem;
  align-self: stretch;
  transition: all 0.2s;
}

.add-column.adding {
  width: 300px;
  min-width: 200px;
  flex: 1 1 300px;
  max-width: 300px;
  align-self: flex-start;
}

.add-column-form {
  padding: var(--spacing-md);
}

.column-input {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}

.column-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.save-button,
.cancel-button {
  flex: 1;
  padding: var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: all 0.2s;
}

.save-button {
  background: var(--color-primary);
  color: white;
}

.save-button:hover {
  background: var(--color-primary-hover);
}

.cancel-button {
  background: var(--color-background-light);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.cancel-button:hover {
  background: var(--color-hover-overlay);
}

.column-header {
  padding: var(--spacing-md);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 3.5rem;
}

.icon-button {
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.icon-button:hover {
  color: var(--color-text-primary);
  background: var(--color-hover-overlay);
}

.icon {
  font-size: 20px;
  line-height: 1;
}

.no-project {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-project h2 {
  color: #5e6c84;
  font-size: 20px;
  font-weight: 500;
}

.add-column .column-header {
  padding-left: var(--spacing-md);
}

.admin-panel {
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
}

.admin-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.action-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 4px var(--color-shadow);
}

.action-card h3 {
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.action-card p {
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-form label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-primary);
  cursor: pointer;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  margin: 0.5rem 0;
  font-family: monospace;
  resize: vertical;
  min-height: 100px;
}

textarea:focus {
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
}

.primary-button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.admin-message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 2rem;
  border-radius: var(--border-radius-sm);
  animation: slideIn 0.3s ease-out;
}

.success {
  background: var(--color-success);
  color: white;
}

.error {
  background: var(--color-error);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px var(--color-shadow);
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  margin: -0.5rem;
  line-height: 1;
}

.close-button:hover {
  color: var(--color-text-primary);
}

.import-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.text-import {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.text-import p {
  margin: 0;
  font-size: 0.9em;
  color: var(--color-text-secondary);
}
</style>
