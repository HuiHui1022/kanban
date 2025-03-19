<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Project } from '../types'

defineOptions({
  name: 'ProjectDetailsModal',
})

const props = defineProps<{
  show: boolean
  project: Project
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', project: Project): void
  (e: 'delete'): void
}>()

const editedTitle = ref('')
const editedDescription = ref('')

watch(
  () => props.project,
  (project) => {
    editedTitle.value = project.title
    editedDescription.value = project.description || ''
  },
  { immediate: true },
)

function handleSubmit() {
  if (!editedTitle.value.trim()) return

  emit('update', {
    ...props.project,
    title: editedTitle.value.trim(),
    description: editedDescription.value.trim(),
  })
  emit('close')
}

function handleDelete() {
  emit('delete')
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Edit Project</h3>
        <button class="close-button" @click="emit('close')">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="project-form">
        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="editedTitle"
            type="text"
            class="form-input"
            placeholder="Enter project title"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="editedDescription"
            class="form-input"
            rows="4"
            placeholder="Enter project description"
          />
        </div>

        <div class="form-actions">
          <button type="button" class="delete-button" @click="handleDelete">Delete Project</button>
          <div class="right-actions">
            <button type="button" class="cancel-button" @click="emit('close')">Cancel</button>
            <button type="submit" class="save-button">Save Changes</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 2px 8px var(--color-shadow);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
}

.close-button:hover {
  color: var(--color-text-primary);
}

.project-form {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
}

.right-actions {
  display: flex;
  gap: 0.5rem;
}

.save-button,
.cancel-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.save-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.save-button:hover {
  background-color: var(--color-primary-hover);
}

.cancel-button {
  background-color: white;
  border: 1px solid var(--color-border);
}

.delete-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--color-error);
  background: none;
  border: none;
}

.delete-button:hover {
  text-decoration: underline;
}
</style>
