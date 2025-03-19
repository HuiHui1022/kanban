import express from 'express'
import {
  getUserCount,
  register,
  login,
  logout,
  getCurrentUser,
  getSettings,
  updateSettings,
  exportData,
  importData,
} from '../controllers/users.js'
import * as kanbanController from '../controllers/kanban.js'
import auth, { requireAdmin } from '../middleware/auth.js'
import * as tokenController from '../controllers/tokens.js'

const router = express.Router()

// Public routes (no authentication required)
router.get('/users/count', getUserCount)
router.get('/auth/settings', getSettings)
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/logout', logout)

// Protected routes (require authentication)
router.use(auth)

router.get('/auth/me', getCurrentUser)
router.get('/projects', kanbanController.getProjects)

// Kanban routes
router.post('/projects', kanbanController.createProject)
router.delete('/projects/:id', kanbanController.deleteProject)

router.get('/columns', kanbanController.getColumns)
router.post('/columns', kanbanController.createColumn)
router.put('/columns/:id', kanbanController.updateColumn)
router.delete('/columns/:id', kanbanController.deleteColumn)

router.get('/tasks', kanbanController.getTasks)
router.post('/tasks', kanbanController.createTask)
router.put('/tasks/:id', kanbanController.updateTask)
router.delete('/tasks/:id', kanbanController.deleteTask)
router.put('/tasks/:id/move', kanbanController.moveTask)

// Admin routes
router.put('/auth/settings', requireAdmin, updateSettings)
router.get('/admin/export', requireAdmin, exportData)
router.post('/admin/import', requireAdmin, importData)

// Add these routes after the auth middleware
router.post('/tokens', tokenController.createToken)
router.get('/tokens', tokenController.listTokens)
router.delete('/tokens/:id', tokenController.deleteToken)

export default router
