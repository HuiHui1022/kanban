<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useKanbanStore } from '../stores/kanban'
import TaskCard from './TaskCard.vue'
import type { Column, Task } from '../types'
import { useRouter } from 'vue-router'
import ConfirmModal from './ConfirmModal.vue'

defineOptions({
  name: 'TaskColumn',
})

const props = defineProps<{
  column: Column
  tasks: Task[]
  columnIndex: number
}>()

const store = useKanbanStore()
const router = useRouter()
const isAddingTask = ref(false)
const newTaskTitle = ref('')
const showErrorModal = ref(false)
const errorMessage = ref('')
const editedTitle = ref(props.column.title)
const isDragOver = ref(false)
const isEditing = ref(false)

const PRIORITY_ORDER = {
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
}

const SORT_OPTIONS = {
  PRIORITY: 'priority',
  DUE_DATE: 'due_date',
  CREATED_DATE: 'created_date',
} as const

const sortBy = ref<keyof typeof SORT_OPTIONS>('PRIORITY')

const startAddingTask = () => {
  isAddingTask.value = true
  nextTick(() => {
    const input = document.querySelector('.quick-add-input') as HTMLInputElement
    if (input) {
      input.focus()
    }
  })
}

const handleAddTask = async () => {
  if (!newTaskTitle.value.trim()) {
    isAddingTask.value = false
    return
  }

  try {
    await store.addTask(props.column.id, {
      title: newTaskTitle.value.trim(),
      description: '',
      priority: 'none',
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    newTaskTitle.value = ''
    isAddingTask.value = false
  } catch (error) {
    console.error('Failed to add task:', error)
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        errorMessage.value = 'Your session has expired. Please log in again.'
        showErrorModal.value = true
      } else {
        errorMessage.value = `Failed to add task: ${error.message}`
        showErrorModal.value = true
      }
    } else {
      errorMessage.value = 'Failed to add task. Please try again.'
      showErrorModal.value = true
    }
  }
}

const cancelAddTask = () => {
  newTaskTitle.value = ''
  isAddingTask.value = false
}

const showDeleteModal = ref(false)

const deleteColumn = () => {
  showDeleteModal.value = true
}

const confirmDeleteColumn = async () => {
  try {
    await store.deleteColumn(props.column.id)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        errorMessage.value = 'Your session has expired. Please log in again.'
        showErrorModal.value = true
      } else {
        errorMessage.value = `Failed to delete column: ${error.message}`
        showErrorModal.value = true
      }
    } else {
      errorMessage.value = 'Failed to delete column. Please try again.'
      showErrorModal.value = true
    }
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = 'move'
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const taskId = event.dataTransfer?.getData('text/plain')
  if (!taskId) return

  try {
    await store.moveTask(taskId, props.column.id)
  } catch (error) {
    console.error('Failed to move task:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      errorMessage.value = 'Your session has expired. Please log in again.'
      showErrorModal.value = true
    } else {
      errorMessage.value = 'Failed to move task. Please try again.'
      showErrorModal.value = true
    }
  }
}

const tasks = computed(() => {
  const columnTasks = store.getTasksByColumnId(props.column.id)

  return [...columnTasks].sort((a, b) => {
    switch (sortBy.value) {
      case 'PRIORITY':
        const priorityDiff =
          (PRIORITY_ORDER[a.priority || 'none'] || 4) - (PRIORITY_ORDER[b.priority || 'none'] || 4)
        if (priorityDiff !== 0) return priorityDiff

        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        }
        if (a.due_date) return -1
        if (b.due_date) return 1

        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()

      case 'DUE_DATE':
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        }
        if (a.due_date) return -1
        if (b.due_date) return 1
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()

      case 'CREATED_DATE':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()

      default:
        return 0
    }
  })
})

const changeSortOption = (option: keyof typeof SORT_OPTIONS) => {
  sortBy.value = option
}

const startEdit = () => {
  editedTitle.value = props.column.title
  isEditing.value = true
  nextTick(() => {
    const input = document.querySelector('.column-title-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const saveEdit = async () => {
  if (editedTitle.value.trim() && editedTitle.value !== props.column.title) {
    try {
      await store.updateColumn(props.column.id, { title: editedTitle.value.trim() })
    } catch (error) {
      console.error('Failed to update column:', error)
      if (error instanceof Error) {
        errorMessage.value = error.message
        showErrorModal.value = true
      }
    }
  }
  isEditing.value = false
}

const cancelEdit = () => {
  editedTitle.value = props.column.title
  isEditing.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.altKey) {
    if (event.code.startsWith('Digit')) {
      const num = parseInt(event.code.slice(5))
      if (num === props.columnIndex + 1) {
        event.preventDefault()
        startAddingTask()
      }
    }
  }
}

const shortcutPrefix = computed(() => {
  const isMac = /mac|iphone|ipod|ipad/i.test(navigator.platform)
  return isMac ? '⌥' : 'Alt+'
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    class="column"
    :class="{ 'drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="column-header">
      <div class="title-wrapper">
        <input
          v-if="isEditing"
          v-model="editedTitle"
          class="column-title-input"
          type="text"
          @keyup.enter="saveEdit"
          @keyup.esc="cancelEdit"
          @blur="saveEdit"
        />
        <h3 v-else @click="startEdit">{{ column.title }}</h3>
        <div class="column-actions">
          <div class="sort-dropdown">
            <button class="sort-button" title="Sort tasks">
              <span class="sort-icon">↕</span>
            </button>
            <div class="sort-menu">
              <button
                :class="{ active: sortBy === 'PRIORITY' }"
                @click="changeSortOption('PRIORITY')"
              >
                Sort by Priority
              </button>
              <button
                :class="{ active: sortBy === 'DUE_DATE' }"
                @click="changeSortOption('DUE_DATE')"
              >
                Sort by Due Date
              </button>
              <button
                :class="{ active: sortBy === 'CREATED_DATE' }"
                @click="changeSortOption('CREATED_DATE')"
              >
                Sort by Created Date
              </button>
            </div>
          </div>
          <button class="delete-button" @click.stop="deleteColumn" title="Delete column">
            <span class="delete-icon">×</span>
          </button>
        </div>
        <div class="shortcut-hint" v-if="columnIndex < 9">
          {{ shortcutPrefix }}{{ columnIndex + 1 }}
        </div>
      </div>
    </div>

    <div class="tasks">
      <div v-for="task in tasks" :key="task.id" class="task-wrapper" :data-task-id="task.id">
        <TaskCard :task="task" />
      </div>

      <button v-if="!isAddingTask" class="add-task-button" @click="startAddingTask">
        <span class="icon">+</span>
        <span>Add Task</span>
      </button>

      <div v-else class="quick-add-task">
        <input
          v-model="newTaskTitle"
          class="quick-add-input"
          type="text"
          placeholder="Enter task title"
          @keydown.enter="handleAddTask"
          @keydown.esc="cancelAddTask"
          @blur="handleAddTask"
        />
      </div>
    </div>
  </div>

  <ConfirmModal
    :show="showDeleteModal"
    title="Delete Column"
    message="Are you sure you want to delete this column and all its tasks?"
    @confirm="confirmDeleteColumn"
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
.column {
  background: #f4f5f7;
  border-radius: 10px;
  width: 350px;
  min-width: 200px;
  flex: 1 1 350px;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  margin: 0.5rem;
}

.column-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  height: 3.5rem;
}

.title-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0;
}

.column-actions {
  display: none;
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  gap: 4px;
}

.title-wrapper:hover .column-actions {
  display: flex;
}

.delete-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #6b778c;
  opacity: 0.7;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.delete-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.08);
  color: #42526e;
}

.delete-icon {
  font-size: 18px;
  line-height: 1;
  font-weight: bold;
}

.column-title-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  font-size: inherit;
  font-weight: 500;
}

.column-title-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.tasks {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-wrapper {
  position: relative;
}

.add-task-button {
  width: 100%;
  border: none;
  background: #f4f5f7;
  box-shadow: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #5e6c84;
  font-size: 14px;
  opacity: 0.8;
  transition: all 0.2s;
  padding: 0.75rem;
}

.add-task-button:hover {
  background: rgba(0, 0, 0, 0.05);
  opacity: 1;
}

.add-task-button .icon {
  font-size: 18px;
  line-height: 1;
}

.quick-add-task {
  padding: 0.5rem;
}

.quick-add-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  font-size: 14px;
}

.quick-add-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.column.drag-over {
  background: #e6effc;
}

h3 {
  margin: 0;
  padding-right: 40px;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
}

.shortcut-hint {
  position: absolute;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: #6b778c;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
}

.title-wrapper:hover .shortcut-hint {
  opacity: 0.7;
}

.sort-dropdown {
  position: relative;
  display: inline-block;
}

.sort-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6b778c;
  opacity: 0.7;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.sort-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.08);
  color: #42526e;
}

.sort-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: none;
  z-index: 1000;
  min-width: 160px;
}

.sort-dropdown:hover .sort-menu {
  display: block;
}

.sort-menu button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  color: #172b4d;
  font-size: 14px;
}

.sort-menu button:hover {
  background: #f4f5f7;
}

.sort-menu button.active {
  background: #e4f0f6;
  color: #0052cc;
}
</style>
