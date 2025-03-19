<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  message: string
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const confirmButton = ref<HTMLButtonElement | null>(null)

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleConfirm()
  } else if (e.key === 'Escape') {
    handleCancel()
  }
}

// Focus the confirm button when modal is shown
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      // Use nextTick to ensure button is mounted
      nextTick(() => {
        confirmButton.value?.focus()
      })
    }
  },
)
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="handleCancel" @keydown="handleKeydown">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>{{ title }}</h2>
        <button class="close-button" @click="handleCancel">&times;</button>
      </header>

      <div class="modal-body">
        <p>{{ message }}</p>
      </div>

      <footer class="modal-footer">
        <button ref="confirmButton" class="confirm-button" @click="handleConfirm">Confirm</button>
        <button class="cancel-button" @click="handleCancel">Cancel</button>
      </footer>
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

.modal-content {
  background: white;
  border-radius: var(--border-radius-md);
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 12px var(--color-shadow);
  /* Add outline styles for focus state */
  outline: none;
}

.modal-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.close-button:hover {
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-body p {
  margin: 0;
  color: var(--color-text-primary);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.confirm-button,
.cancel-button {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.confirm-button {
  background: var(--color-error);
  color: white;
}

.confirm-button:hover {
  background: #ff4d1f;
}

.cancel-button {
  background: var(--color-background-light);
}

.cancel-button:hover {
  background: var(--color-border);
}

.confirm-button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
