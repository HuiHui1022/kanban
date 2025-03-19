const API_URL = '/api'

const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || 'API Error')
  }

  return response.json()
}

export const api = {
  async get<T>(url: string): Promise<T> {
    return request<T>(url)
  },

  async post(url: string, data?: any) {
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to import data')
    }

    return response.json()
  },

  async put<T>(url: string, data?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async delete<T>(url: string): Promise<T> {
    return request<T>(url, {
      method: 'DELETE',
    })
  },

  patch: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}

export async function register(username: string, password: string) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function login(username: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

interface ProjectUpdate {
  title?: string
  description?: string
}

export async function updateProject(projectId: string, updates: ProjectUpdate) {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    ...defaultOptions,
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return response.json()
}
