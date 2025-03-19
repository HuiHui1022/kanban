<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../services/api'
import ConfirmModal from './ConfirmModal.vue'

interface Token {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
}

const tokens = ref<Token[]>([])
const newTokenName = ref('')
const showCreateForm = ref(false)
const newToken = ref<{ token: string } | null>(null)
const showDeleteModal = ref(false)
const tokenToDelete = ref<Token | null>(null)
const isCopied = ref(false)

async function loadTokens() {
  try {
    tokens.value = await api.get('/tokens')
  } catch (error) {
    console.error('Failed to load tokens:', error)
  }
}

async function handleCreateToken() {
  if (!newTokenName.value.trim()) return

  try {
    const response = await api.post('/tokens', { name: newTokenName.value.trim() })
    newToken.value = response
    newTokenName.value = ''
    showCreateForm.value = false
    await loadTokens()
  } catch (error) {
    console.error('Failed to create token:', error)
  }
}

async function handleRevokeToken(token: Token) {
  try {
    await api.delete(`/tokens/${token.id}`)
    await loadTokens()
  } catch (error) {
    console.error('Failed to revoke token:', error)
  }
}

const copyToken = async (token: string) => {
  await navigator.clipboard.writeText(token)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

onMounted(loadTokens)
</script>

<template>
  <div class="api-tokens">
    <!-- Create Token Section -->
    <div v-if="!showCreateForm" class="create-section">
      <button class="create-button" @click="showCreateForm = true">
        <span class="icon">+</span>
        Generate New Token
      </button>
    </div>

    <div v-else class="create-form">
      <input
        v-model="newTokenName"
        type="text"
        placeholder="Enter token name..."
        class="token-input"
        @keyup.enter="handleCreateToken"
        @keyup.esc="showCreateForm = false"
      />
      <div class="form-actions">
        <button class="submit-button" @click="handleCreateToken" :disabled="!newTokenName.trim()">
          Generate
        </button>
        <button class="cancel-button" @click="showCreateForm = false">Cancel</button>
      </div>
    </div>

    <!-- Token List -->
    <div v-if="tokens.length" class="token-list">
      <div v-for="token in tokens" :key="token.id" class="token-item">
        <div class="token-status" :class="{ active: token.last_used_at }"></div>
        <div class="token-content">
          <div class="token-header">
            <div class="token-badge">
              <span class="key-icon">🔑</span>
              <span class="token-name">{{ token.name }}</span>
            </div>
            <button class="revoke-button" @click="handleRevokeToken(token)">
              <span class="revoke-icon">×</span>
              <span class="revoke-text">Revoke</span>
            </button>
          </div>
          <div class="token-meta">
            <div class="meta-item">
              <span class="meta-dot"></span>
              Created {{ new Date(token.created_at).toLocaleDateString() }}
            </div>
            <div v-if="token.last_used_at" class="meta-item active">
              <span class="meta-dot"></span>
              Last used {{ new Date(token.last_used_at).toLocaleDateString() }}
            </div>
            <div v-else class="meta-item inactive">
              <span class="meta-dot"></span>
              Never used
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!showCreateForm" class="empty-state">No API tokens yet</div>

    <!-- New Token Modal -->
    <div v-if="newToken" class="token-modal">
      <div class="modal-content">
        <h3>New Token Created</h3>
        <p class="warning">Copy this token now. You won't be able to see it again!</p>
        <div class="token-value">
          <code>{{ newToken.token }}</code>
          <button class="copy-button" @click="copyToken(newToken.token)">
            {{ isCopied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <button class="close-button" @click="newToken = null">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.api-tokens {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
}

.create-form {
  background: var(--color-background-light);
  padding: 1rem;
  border-radius: var(--border-radius-sm);
}

.token-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.submit-button,
.cancel-button {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

.submit-button {
  background: var(--color-primary);
  color: white;
  border: none;
}

.cancel-button {
  background: none;
  border: 1px solid var(--color-border);
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.token-item {
  display: flex;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border);
}

.token-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: var(--color-primary);
}

.token-status {
  width: 4px;
  background: var(--color-text-secondary);
  opacity: 0.2;
}

.token-status.active {
  background: var(--color-success);
  opacity: 1;
}

.token-content {
  flex: 1;
  padding: 1rem 1.25rem;
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.token-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-background-light);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.key-icon {
  font-size: 1em;
  opacity: 0.8;
}

.token-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.token-meta {
  display: flex;
  gap: 1.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-item.active {
  color: var(--color-success);
}

.meta-item.inactive {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}

.revoke-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: white;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}

.token-item:hover .revoke-button {
  opacity: 1;
}

.revoke-button:hover {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.revoke-icon {
  font-size: 1.2em;
  line-height: 1;
}

.token-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-sm);
  max-width: 500px;
  width: 100%;
}

.warning {
  color: var(--color-error);
  margin: 1rem 0;
}

.token-value {
  background: var(--color-background-light);
  padding: 1rem;
  border-radius: var(--border-radius-sm);
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
}

.token-value code {
  flex: 1;
  word-break: break-all;
}

.copy-button {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

.close-button {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-background-light);
  border-radius: 12px;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
}
</style>
