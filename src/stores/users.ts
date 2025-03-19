import { defineStore } from 'pinia'
import { api } from '../services/api'

interface Settings {
  allowSignup: boolean
}

interface UsersState {
  settings: Settings
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    settings: {
      allowSignup: true,
    },
  }),

  actions: {
    async getSettings() {
      try {
        const response = await api.get<Settings>('/auth/settings')
        this.settings = response
        return response
      } catch (error) {
        console.error('Failed to get settings:', error)
        // Return default settings on error
        return { allowSignup: true }
      }
    },

    async updateSettings(settings: Settings) {
      const response = await api.put<Settings>('/auth/settings', settings)
      this.settings = response
      return response
    },
  },
})
