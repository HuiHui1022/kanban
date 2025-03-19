const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:13008')

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  console.log(`API Request: ${options.method || 'GET'} ${endpoint}`)

  try {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    })

    console.log(`API Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      console.error('API Error:', error)
      throw new Error(error.error || 'API Error')
    }

    const data = await response.json()
    console.log('API Response data:', data)
    return data
  } catch (error) {
    console.error('API Request failed:', error)
    throw error
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
    }),
}
