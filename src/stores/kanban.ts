import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Project, Column, Task } from '../types'
import { api } from '../services/api'

export const useKanbanStore = defineStore('kanban', () => {
  const projects = ref<Project[]>([])
  const columns = ref<Column[]>([])
  const tasks = ref<Task[]>([])
  const activeProjectId = ref<string | null>(null)
  const editingColumnId = ref<string | null>(null)
  const editingTaskId = ref<string | null>(null)
  const draggedTaskId = ref<string | null>(null)
  const dropTarget = ref<{ columnId: string; position: 'top' | 'bottom' } | null>(null)

  // Project operations
  async function addProject(title: string) {
    try {
      if (!title.trim()) {
        throw new Error('Project title is required')
      }

      const project = await api.post<Project>('/projects', {
        title: title.trim(),
        order: projects.value.length,
      })

      projects.value.push(project)

      const defaultColumns = [
        { title: 'Todo', order: 0 },
        { title: 'In Progress', order: 1 },
        { title: 'Done', order: 2 },
      ]

      try {
        for (const col of defaultColumns) {
          const column = await api.post<Column>('/columns', {
            title: col.title,
            project_id: project.id,
            order: col.order,
          })
          columns.value.push(column)
        }
      } catch (columnError) {
        try {
          await api.delete(`/projects/${project.id}`)
          projects.value = projects.value.filter((p) => p.id !== project.id)
        } catch (rollbackError) {
          // Keep error logging for critical failures
          console.error('Failed to rollback project:', rollbackError)
        }
        throw columnError
      }

      if (projects.value.length === 1) {
        await setActiveProject(project.id)
      }

      return project
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          window.location.href = '/login'
        }
        throw new Error(error.message)
      }
      throw new Error('Failed to create project')
    }
  }

  async function setActiveProject(projectId: string) {
    try {
      activeProjectId.value = projectId
      // Load columns for this project
      const response = await api.get<Column[]>(`/columns?project_id=${projectId}`)
      columns.value = response

      // Also load tasks for this project
      const tasksResponse = await api.get<Task[]>(`/tasks?project_id=${projectId}`)
      tasks.value = tasksResponse
    } catch (error) {
      console.error('Error loading project data:', error)
      throw error
    }
  }

  async function deleteProject(projectId: string) {
    try {
      console.log('Deleting project:', projectId)
      await api.delete(`/projects/${projectId}`)
      // Remove project from local state
      projects.value = projects.value.filter((p) => p.id !== projectId)
      // Clear active project if it was deleted
      if (activeProjectId.value === projectId) {
        activeProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      if (error instanceof Error && error.message === 'Unauthorized') {
        window.location.href = '/login'
      }
      throw error
    }
  }

  async function updateProject(projectId: string, updates: { title: string }) {
    try {
      console.log('Updating project:', { projectId, updates })
      const response = await api.put<Project>(`/projects/${projectId}`, updates)
      console.log('Server response:', response)

      const updatedProject = response as Project
      console.log('Updated project data:', updatedProject)

      const index = projects.value.findIndex((p) => p.id === projectId)
      if (index !== -1) {
        const oldProject = projects.value[index]
        const newProject = { ...oldProject, ...updatedProject, title: updates.title }
        console.log('Updating local state:', { old: oldProject, new: newProject })
        projects.value[index] = newProject
      }

      return updatedProject
    } catch (error) {
      console.error('Error updating project:', error)
      if (error instanceof Error) {
        throw new Error(error.message)
      }
      throw new Error('Failed to update project')
    }
  }

  // Column operations
  async function addColumn(projectId: string, title: string) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      const response = await api.post<Column>('/columns', {
        title,
        project_id: projectId,
        order: columns.value.filter((c) => c.project_id === projectId).length,
      })

      columns.value = [...columns.value, response]
      return response
    } catch (error) {
      console.error('Error creating column:', error)
      if ((error as Error).message === 'Unauthorized') {
        // Optionally redirect to login or show auth error
        window.location.href = '/login'
      }
      throw error
    }
  }

  async function updateColumn(columnId: string, updates: { title: string }) {
    try {
      const response = await api.put<Column>(`/columns/${columnId}`, updates)

      // Update the column in local state
      columns.value = columns.value.map((c) => (c.id === columnId ? response : c))

      return response
    } catch (error) {
      console.error('Error updating column:', error)
      throw error
    }
  }

  async function deleteColumn(columnId: string) {
    try {
      await api.delete(`/columns/${columnId}`)
      // Remove the column from local state
      columns.value = columns.value.filter((c) => c.id !== columnId)
      // Also remove all tasks in this column
      tasks.value = tasks.value.filter((t) => t.column_id !== columnId)
    } catch (error) {
      console.error('Error deleting column:', error)
      if (error instanceof Error && error.message === 'Unauthorized') {
        window.location.href = '/login'
      }
      throw error
    }
  }

  // Task operations
  async function addTask(columnId: string, task: Omit<Task, 'id' | 'column_id' | 'order'>) {
    try {
      if (!columnId) {
        throw new Error('Column ID is required')
      }

      const response = await api.post<Task>('/tasks', {
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'none',
        due_date: task.due_date || null,
        column_id: columnId,
      })

      tasks.value = [...tasks.value, response]
      return response
    } catch (error) {
      console.error('Error creating task:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message)
        if (error.message === 'Unauthorized') {
          window.location.href = '/login'
        }
      }
      throw error
    }
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
      const updatedTask = await api.put<Task>(`/tasks/${taskId}`, updates)
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await api.delete(`/tasks/${taskId}`)
      // Remove the task from local state
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    } catch (error) {
      console.error('Error deleting task:', error)
      if (error instanceof Error && error.message === 'Unauthorized') {
        window.location.href = '/login'
      }
      throw error
    }
  }

  // Drag and drop operations
  function setDraggedTaskId(taskId: string) {
    draggedTaskId.value = taskId
  }

  function setDropTarget(target: { columnId: string; position: 'top' | 'bottom' } | null) {
    dropTarget.value = target
  }

  async function moveTask(taskId: string, targetColumnId: string) {
    try {
      const response = await api.put<Task>(`/tasks/${taskId}/move`, {
        column_id: targetColumnId,
      })

      // Update the task in local state
      tasks.value = tasks.value.map((t) => (t.id === taskId ? response : t))
    } catch (error) {
      console.error('Error moving task:', error)
      throw error
    }
  }

  // Load user data
  async function loadUserData() {
    try {
      console.log('Loading user data...')
      const [projectsData, columnsData, tasksData] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<Column[]>('/columns'),
        api.get<Task[]>('/tasks'),
      ])

      console.log('Loaded projects:', projectsData)
      projects.value = projectsData
      columns.value = columnsData
      tasks.value = tasksData

      // Set first project as active if there is one and no active project
      if (!activeProjectId.value && projects.value.length > 0) {
        await setActiveProject(projects.value[0].id)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      throw error
    }
  }

  // Update getTasksByColumnId to simply return filtered tasks
  function getTasksByColumnId(columnId: string) {
    return tasks.value.filter((t) => t.column_id === columnId)
  }

  return {
    projects,
    columns,
    tasks,
    activeProjectId,
    editingColumnId,
    editingTaskId,
    draggedTaskId,
    dropTarget,
    addProject,
    setActiveProject,
    addColumn,
    updateColumn,
    deleteColumn,
    addTask,
    updateTask,
    deleteTask,
    setDraggedTaskId,
    setDropTarget,
    moveTask,
    loadUserData,
    deleteProject,
    updateProject,
    getTasksByColumnId,
  }
})
