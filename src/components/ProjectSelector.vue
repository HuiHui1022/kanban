<script setup lang="ts">
import { useKanbanStore } from '../stores/kanban'
import { useAuthStore } from '../stores/auth'
import { ref, nextTick, computed } from 'vue'
import ConfirmModal from './ConfirmModal.vue'
import { useRouter } from 'vue-router'
import type { Project } from '../types'

const store = useKanbanStore()
const authStore = useAuthStore()
const router = useRouter()
const showAddForm = ref(false)
const newProjectTitle = ref('')
const showDeleteModal = ref(false)
const projectToDelete = ref<string | null>(null)
const showConfirmLogout = ref(false)

// Add new ref for the modal
const editingProjectId = ref<string | null>(null)
const editedTitle = ref('')

const sortedProjects = computed(() => {
  return [...store.projects].sort((a, b) => (a.order || 0) - (b.order || 0))
})

const addProject = async () => {
  if (newProjectTitle.value.trim()) {
    try {
      const project = await store.addProject(newProjectTitle.value)
      if (project) {
        await store.setActiveProject(project.id)
      }
      newProjectTitle.value = ''
      showAddForm.value = false
    } catch (error) {
      console.error('Failed to add project:', error)
      alert(error instanceof Error ? error.message : 'Failed to add project')
    }
  }
}

const startAddProject = async () => {
  showAddForm.value = true
  await nextTick()
}

const cancelAdd = () => {
  showAddForm.value = false
  newProjectTitle.value = ''
}

const startDeleteProject = (projectId: string) => {
  projectToDelete.value = projectId
  showDeleteModal.value = true
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Failed to logout:', error)
  }
}

const handleAdminClick = () => {
  console.log('Admin button clicked')
  emit('openAdmin')
}

const emit = defineEmits<{
  (e: 'openAdmin'): void
}>()

const startEditProject = (project: Project) => {
  editingProjectId.value = project.id
  editedTitle.value = project.title
  nextTick(() => {
    const input = document.querySelector('.edit-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const saveProjectEdit = async (projectId: string) => {
  if (editedTitle.value.trim()) {
    try {
      await store.updateProject(projectId, { title: editedTitle.value.trim() })
      editingProjectId.value = null
    } catch (error) {
      console.error('Failed to update project:', error)
    }
  }
}

const cancelProjectEdit = () => {
  editingProjectId.value = null
  editedTitle.value = ''
}
</script>

<template>
  <div class="project-selector">
    <div class="projects-header">
      <h2>Projects</h2>
    </div>

    <div class="projects-list">
      <div
        v-for="project in sortedProjects"
        :key="project.id"
        :class="['project-item', { active: project.id === store.activeProjectId }]"
        @click="store.setActiveProject(project.id)"
      >
        <!-- Edit mode -->
        <div v-if="editingProjectId === project.id" @click.stop>
          <input
            v-model="editedTitle"
            class="edit-input"
            @keyup.enter="saveProjectEdit(project.id)"
            @keyup.esc="cancelProjectEdit"
            @blur="cancelProjectEdit"
          />
        </div>

        <!-- Display mode -->
        <div v-else class="project-display">
          <span class="project-title">{{ project.title }}</span>
          <div class="project-actions">
            <button class="project-action-btn" @click.stop="startEditProject(project)">
              <span class="action-icon">✎</span>
            </button>
            <button class="project-action-btn" @click.stop="startDeleteProject(project.id)">
              <span class="action-icon">×</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="showAddForm" class="quick-add-form">
        <input
          ref="projectInput"
          v-model="newProjectTitle"
          placeholder="Enter project title..."
          @keyup.enter="addProject"
          @keyup.esc="cancelAdd"
          @blur="cancelAdd"
          class="quick-add-input"
        />
      </div>
      <div v-else class="add-project-button" @click="startAddProject">
        <span class="icon">+</span>
        <span>Add Project</span>
      </div>
    </div>

    <div class="actions">
      <div v-if="authStore.currentUser?.isAdmin" class="action-item" @click="handleAdminClick">
        <span class="action-icon">⚙️</span>
        <span class="action-title">Admin</span>
      </div>
      <div class="action-item" @click="showConfirmLogout = true">
        <span class="action-icon">🚪</span>
        <span class="action-title">Logout</span>
      </div>
    </div>

    <ConfirmModal
      :show="showDeleteModal"
      title="Delete Project"
      message="Are you sure you want to delete this project and all its data?"
      @confirm="
        () => {
          if (projectToDelete) {
            store.deleteProject(projectToDelete)
            projectToDelete = null
          }
          showDeleteModal = false
        }
      "
      @cancel="
        () => {
          projectToDelete = null
          showDeleteModal = false
        }
      "
    />

    <ConfirmModal
      :show="showConfirmLogout"
      title="Confirm Logout"
      message="Are you sure you want to log out?"
      @confirm="handleLogout"
      @cancel="showConfirmLogout = false"
    />
  </div>
</template>

<style scoped>
.project-selector {
  width: 240px;
  background: white;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.projects-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.projects-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-project-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  border-radius: 3px;
  margin-top: 0.5rem;
}

.add-project-button:hover {
  background: var(--color-background-light);
  color: var(--color-text-primary);
}

.add-project-button .icon {
  font-size: 16px;
  line-height: 1;
}

.quick-add-form {
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
}

.quick-add-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 3px;
  font-size: 13px;
}

.quick-add-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.projects-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  margin-bottom: auto;
}

.project-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 13px;
  border-radius: 3px;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.project-item:hover {
  background: var(--color-background-light);
}

.project-item.active {
  background: var(--color-background-light);
  color: var(--color-text-primary);
  font-weight: 500;
}

.project-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px;
}

.project-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.project-item:hover .project-actions {
  opacity: 1;
}

.action-icon {
  font-size: 14px;
  line-height: 1;
}

.action-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-edit-container {
  display: flex;
  gap: 8px;
  padding: 4px;
  width: 100%;
}

.edit-project-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: var(--font-size-sm);
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.save-button,
.cancel-button {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.save-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.cancel-button {
  background-color: transparent;
  border: 1px solid var(--color-border);
}

.edit-button,
.delete-button {
  font-size: inherit;
}

.actions {
  border-top: 1px solid var(--color-border);
  padding: 0.5rem;
  margin-top: auto;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 13px;
  border-radius: 3px;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.action-item:hover {
  background: var(--color-background-light);
}

.action-icon {
  font-size: 16px;
  line-height: 1;
  opacity: 0.8;
}

.action-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 3px;
  font-size: 13px;
  background: white;
  color: var(--color-text-primary);
}

.edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.project-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-action-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  width: 24px;
  height: 24px;
}

.project-action-btn:hover {
  background-color: var(--color-background-light);
  color: var(--color-text-primary);
}

.action-icon {
  font-size: 14px;
  line-height: 1;
}
</style>
