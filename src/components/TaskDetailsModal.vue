<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Task } from '../types'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  show: boolean
  task: Task
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', task: Task): void
  (e: 'delete'): void
}>()

const editedTitle = ref('')
const editedDescription = ref('')
const editedPriority = ref<'high' | 'medium' | 'low' | 'none'>('none')
const editedDueDate = ref('')

watch(
  () => props.task,
  (task) => {
    editedTitle.value = task.title
    editedDescription.value = task.description
    editedPriority.value = task.priority
    editedDueDate.value = task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''
  },
  { immediate: true },
)

function handleSubmit() {
  if (!editedTitle.value.trim()) return

  emit('update', {
    ...props.task,
    title: editedTitle.value.trim(),
    description: editedDescription.value.trim(),
    priority: editedPriority.value,
    due_date: editedDueDate.value ? new Date(editedDueDate.value).toISOString() : null,
  })
  emit('close')
}

function handleDelete() {
  emit('delete')
  emit('close')
}
</script>

<template>
  <BaseModal :show="show" @close="$emit('close')">
    <template #header>
      <h3>Task Details</h3>
    </template>

    <div class="form-group">
      <label for="title">Title</label>
      <input
        id="title"
        v-model="editedTitle"
        type="text"
        class="form-input"
        placeholder="Task title"
      />
    </div>

    <div class="form-group">
      <label for="description">Description</label>
      <textarea
        id="description"
        v-model="editedDescription"
        class="form-input"
        placeholder="Task description"
      />
    </div>

    <div class="form-group">
      <label for="priority">Priority</label>
      <select id="priority" v-model="editedPriority" class="form-input">
        <option value="none">None</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>

    <div class="form-group">
      <label for="due-date">Due Date</label>
      <input id="due-date" v-model="editedDueDate" type="datetime-local" class="form-input" />
    </div>

    <template #footer>
      <div class="modal-actions">
        <button class="delete-button" @click="handleDelete">Delete</button>
        <div class="right-actions">
          <button class="cancel-button" @click="$emit('close')">Cancel</button>
          <button class="save-button" @click="handleSubmit">Save</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.right-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.save-button,
.cancel-button,
.delete-button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
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
  color: var(--color-text-primary);
}

.cancel-button:hover {
  background: var(--color-hover-overlay);
}

.delete-button {
  background: var(--color-error);
  color: white;
}

.delete-button:hover {
  opacity: 0.9;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

textarea {
  min-height: 100px;
  resize: vertical;
}
</style>
