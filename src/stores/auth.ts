import { defineStore } from 'pinia'
import { api } from '../services/api'
import type { User } from '../types'

interface SignupCredentials {
  username: string
  password: string
  displayName: string
}

interface LoginCredentials {
  username: string
  password: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as User | null,
    isAuthenticated: false,
    allowSignup: true,
  }),

  actions: {
    async signup(credentials: SignupCredentials) {
      try {
        const { count } = await api.get<{ count: number }>('/users/count')
        const response = await api.post<{ user: User }>('/auth/register', {
          username: credentials.username,
          password: credentials.password,
          displayName: credentials.displayName,
          isAdmin: count === 0,
        })

        this.currentUser = response.user
        this.isAuthenticated = true
        return response.user
      } catch (error) {
        throw error
      }
    },

    async login(credentials: LoginCredentials) {
      try {
        const response = await api.post<{ user: User }>('/auth/login', credentials)
        this.currentUser = response.user
        this.isAuthenticated = true
        return response
      } catch (error) {
        this.currentUser = null
        this.isAuthenticated = false
        throw error
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout')
        this.currentUser = null
        this.isAuthenticated = false
      } catch (error) {
        throw error
      }
    },

    async checkAuth() {
      try {
        const response = await api.get<{ user: User }>('/auth/me')
        this.currentUser = response.user
        this.isAuthenticated = true
        return response.user
      } catch (error) {
        console.error('Authentication error:', error)
        this.currentUser = null
        this.isAuthenticated = false
        return null
      }
    },

    async getSettings() {
      const response = await api.get<{ allowSignup: boolean }>('/auth/settings')
      this.allowSignup = response.allowSignup
      return response
    },

    async updateSettings(settings: { allowSignup: boolean }) {
      const response = await api.put<{ allowSignup: boolean }>('/auth/settings', settings)
      this.allowSignup = response.allowSignup
      return response
    },
  },
})
