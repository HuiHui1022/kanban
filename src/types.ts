export interface Task {
  id: string
  column_id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low' | 'none'
  due_date: string | null
  order: number
  created_at: string
  updated_at: string
}

export interface NewTask {
  title: string
  description: string
  priority?: 'high' | 'medium' | 'low' | 'none'
  due_date?: string | null
  created_at: string
  updated_at: string
}

export interface Column {
  id: string
  project_id: string
  title: string
  order: number
  created_at?: string
}

export interface Project {
  id: string
  title: string
  description?: string
  order: number
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  username: string
  displayName: string
  isAdmin: boolean
}
