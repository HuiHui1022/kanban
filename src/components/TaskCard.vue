<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useKanbanStore } from '../stores/kanban'
import type { Task } from '../types'
import { useRouter } from 'vue-router'
import TaskDetailsModal from './TaskDetailsModal.vue'
import ConfirmModal from './ConfirmModal.vue'

const props = defineProps<{
  task: Task
}>()

const store = useKanbanStore()
const router = useRouter()
const showDetailsModal = ref(false)
const showDeleteModal = ref(false)
const showErrorModal = ref(false)
const errorMessage = ref('')
const isEditing = ref(false)
const editedTitle = ref('')

const formattedDueDate = computed(() => {
  if (!props.task.due_date) return null

  const dueDate = new Date(props.task.due_date)
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    text: dueDate.toLocaleDateString(),
    isUrgent: diffDays <= 3 && diffDays >= 0,
    isOverdue: diffDays < 0
  }
})

const openDetails = (e: Event) => {
  e.stopPropagation()
  showDetailsModal.value = true
}

const handleTaskUpdate = async (updatedTask: Task) => {
  try {
    await store.updateTask(props.task.id, {
      title: updatedTask.title,
      description: updatedTask.description,
      priority: updatedTask.priority || 'none',
      due_date: updatedTask.due_date || null,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        errorMessage.value = 'Your session has expired. Please log in again.'
        showErrorModal.value = true
      } else {
        errorMessage.value = `Failed to update task: ${error.message}`
        showErrorModal.value = true
      }
    } else {
      errorMessage.value = 'Failed to update task. Please try again.'
      showErrorModal.value = true
    }
  }
}

const deleteTask = (e: Event) => {
  e.stopPropagation()
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    await store.deleteTask(props.task.id)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        errorMessage.value = 'Your session has expired. Please log in again.'
        showErrorModal.value = true
      } else {
        errorMessage.value = `Failed to delete task: ${error.message}`
        showErrorModal.value = true
      }
    } else {
      errorMessage.value = 'Failed to delete task. Please try again.'
      showErrorModal.value = true
    }
  }
}

const handleDragStart = (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.task.id)
  const card = event.target as HTMLElement
  card.classList.add('dragging')
}

const handleDragEnd = (event: DragEvent) => {
  const card = event.target as HTMLElement
  card.classList.remove('dragging')
}

const handleTaskDelete = () => {
  showDeleteModal.value = true
  showDetailsModal.value = false
}

const startEditing = (e: Event) => {
  e.stopPropagation()
  editedTitle.value = props.task.title
  isEditing.value = true
  // Focus the input after it's rendered
  nextTick(() => {
    const input = document.querySelector('.quick-edit-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const handleTitleUpdate = async () => {
  if (editedTitle.value.trim() === props.task.title) {
    isEditing.value = false
    return
  }

  try {
    await store.updateTask(props.task.id, {
      ...props.task,
      title: editedTitle.value.trim(),
    })
    isEditing.value = false
  } catch (error) {
    console.error('Failed to update task:', error)
  }
}

const handleTitleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleTitleUpdate()
  } else if (e.key === 'Escape') {
    isEditing.value = false
    editedTitle.value = props.task.title
  }
}
</script>

<template>
  <div
    class="task-card"
    :class="[`priority-${task.priority}`]"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <div class="task-content">
      <div v-if="!isEditing" class="task-title" @click="startEditing">
        {{ task.title }}
      </div>
      <input
        v-else
        v-model="editedTitle"
        class="quick-edit-input"
        type="text"
        @keydown="handleTitleKeydown"
        @blur="handleTitleUpdate"
      />
      <div v-if="task.description" class="task-description">
        {{ task.description }}
      </div>
      <div
        v-if="formattedDueDate"
        class="task-due-date"
        :class="{
          urgent: formattedDueDate.isUrgent,
          overdue: formattedDueDate.isOverdue
        }"
      >
        {{ formattedDueDate.text }}
      </div>
    </div>
    <div class="task-actions">
      <button class="edit-button" @click.stop="openDetails" title="Edit Task Details">
        <span class="icon">✎</span>
      </button>
      <button class="delete-button" @click.stop="deleteTask" title="Delete Task">×</button>
    </div>
  </div>

  <Teleport to="body">
    <TaskDetailsModal
      v-if="showDetailsModal"
      :show="showDetailsModal"
      :task="task"
      @close="showDetailsModal = false"
      @update="handleTaskUpdate"
      @delete="handleTaskDelete"
    />
  </Teleport>

  <ConfirmModal
    :show="showDeleteModal"
    title="Delete Task"
    message="Are you sure you want to delete this task?"
    @confirm="confirmDelete"
    @cancel="showDeleteModal = false"
  />

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
</template>

<style scoped>
.task-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding: 0.75rem;
  cursor: move !important;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  position: relative;
  overflow: visible;
  min-height: 2.5rem;
}

.priority-high {
  background: #fff1f0;
}

.priority-medium {
  background: #fffbe6;
}

.priority-low {
  background: #f0f5ff;
}

.task-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.task-content {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.task-title {
  font-weight: 500;
  color: #172b4d;
  font-size: 14px;
  word-wrap: break-word;
  cursor: text !important;
  width: 100%;
}

.task-description {
  margin-top: 0.25rem;
  color: #5e6c84;
  font-size: 12px;
  word-wrap: break-word;
  padding-right: 3rem;
}

.task-actions {
  display: flex;
  gap: 0.25rem;
  align-items: flex-start;
  position: absolute;
  right: 0.75rem;
  bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 0 2px;
  pointer-events: none;
  visibility: hidden;
}

.task-card:hover .task-actions {
  pointer-events: auto;
  visibility: visible;
}

.edit-button,
.delete-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer !important;
  color: #5e6c84;
  padding: 0.25rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-button {
  font-size: 14px;
}

.task-card:hover .edit-button,
.task-card:hover .delete-button {
  z-index: 1;
}

.edit-button:hover,
.delete-button:hover {
  opacity: 1 !important;
  color: #172b4d;
}

.task-card.dragging {
  opacity: 0.5;
  transform: scale(1.05);
}

.quick-edit-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #172b4d;
  background: white;
  margin: -0.5rem 0; /* Compensate for the padding */
}

.quick-edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.task-due-date {
  font-size: 12px;
  color: #5e6c84;
  margin-top: 0.25rem;
  display: inline-block;
  background-color: #ebecf0;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.task-due-date.urgent {
  color: #de350b;
  background-color: #ffebe6;
  font-weight: 600;
}

.task-due-date.overdue {
  color: #ffffff;
  background-color: #de350b;
  font-weight: 600;
}
</style>
