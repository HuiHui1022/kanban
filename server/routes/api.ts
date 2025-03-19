import express from 'express'
import * as kanbanController from '../controllers/kanban.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Projects
router.get('/projects', requireAuth, kanbanController.getProjects)
router.post('/projects', requireAuth, kanbanController.createProject)
router.put('/projects/:id', requireAuth, kanbanController.updateProject)
router.delete('/projects/:id', requireAuth, kanbanController.deleteProject)

// Columns
router.get('/columns', requireAuth, kanbanController.getColumns)
router.post('/columns', requireAuth, kanbanController.createColumn)
router.put('/columns/:id', requireAuth, kanbanController.updateColumn)
router.delete('/columns/:id', requireAuth, kanbanController.deleteColumn)

// Tasks
router.get('/tasks', requireAuth, kanbanController.getTasks)
router.post('/tasks', requireAuth, kanbanController.createTask)
router.put('/tasks/:id', requireAuth, kanbanController.updateTask)
router.delete('/tasks/:id', requireAuth, kanbanController.deleteTask)

export default router
