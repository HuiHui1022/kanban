import { Request, Response } from 'express'
import { pool } from '../db/index.js'

// Projects
export async function getProjects(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT p.*
       FROM projects p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user?.id],
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function createProject(req: Request, res: Response) {
  const { title, description } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO projects (title, description, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, description, req.user?.id],
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function deleteProject(req: Request, res: Response) {
  console.log('Deleting project:', { projectId: req.params.id, userId: req.user?.id })
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user?.id],
    )
    console.log('Deleted project:', result.rows[0])
    res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// Columns
export async function getColumns(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT c.*
       FROM columns c
       JOIN projects p ON c.project_id = p.id
       WHERE p.user_id = $1
       ORDER BY c.created_at ASC`,
      [req.user?.id],
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get columns error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function createColumn(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { title, project_id } = req.body

    // Verify project ownership
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, req.user.id],
    )

    if (projectResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const result = await pool.query(
      `INSERT INTO columns (title, project_id)
       VALUES ($1, $2)
       RETURNING *`,
      [title, project_id],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create column error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateColumn(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `UPDATE columns c
       SET title = $1, updated_at = CURRENT_TIMESTAMP
       FROM projects p
       WHERE c.id = $2 AND c.project_id = p.id AND p.user_id = $3
       RETURNING c.*`,
      [req.body.title, req.params.id, req.user?.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update column error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function deleteColumn(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `DELETE FROM columns c
       USING projects p
       WHERE c.id = $1 AND c.project_id = p.id AND p.user_id = $2
       RETURNING c.*`,
      [req.params.id, req.user?.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' })
    }
    res.json({ message: 'Column deleted successfully' })
  } catch (error) {
    console.error('Delete column error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// Tasks
export async function getTasks(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT t.*
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE p.user_id = $1
       ORDER BY
         CASE t.priority
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
           ELSE 4
         END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`,
      [req.user?.id],
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function createTask(req: Request, res: Response) {
  try {
    if (!req.user) {
      console.log('Unauthorized attempt to create task - no user session')
      return res.status(403).json({ error: 'Unauthorized - No user session' })
    }

    const { title, description, column_id, priority, due_date } = req.body
    console.log('Creating task:', {
      title,
      description,
      column_id,
      priority,
      due_date,
      userId: req.user.id,
    })

    // Verify column ownership
    const columnResult = await pool.query(
      `SELECT c.id FROM columns c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND p.user_id = $2`,
      [column_id, req.user.id],
    )

    if (columnResult.rows.length === 0) {
      console.log('Unauthorized attempt to create task - invalid column access')
      return res.status(403).json({ error: 'Unauthorized - Invalid column access' })
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, column_id, priority, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || '', column_id, priority || 'none', due_date || null],
    )

    console.log('Created task:', result.rows[0])
    res.json(result.rows[0])
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateTask(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `UPDATE tasks t
       SET title = $1, description = $2, priority = $3, due_date = $4, updated_at = CURRENT_TIMESTAMP
       FROM columns c
       JOIN projects p ON c.project_id = p.id
       WHERE t.id = $5 AND t.column_id = c.id AND p.user_id = $6
       RETURNING t.*`,
      [
        req.body.title,
        req.body.description,
        req.body.priority || 'none',
        req.body.due_date,
        req.params.id,
        req.user?.id,
      ],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function deleteTask(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `DELETE FROM tasks t
       USING columns c
       JOIN projects p ON c.project_id = p.id
       WHERE t.id = $1 AND t.column_id = c.id AND p.user_id = $2
       RETURNING t.*`,
      [req.params.id, req.user?.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function moveTask(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `UPDATE tasks t
       SET column_id = $1, updated_at = CURRENT_TIMESTAMP
       FROM columns c
       JOIN projects p ON c.project_id = p.id
       WHERE t.id = $2 AND c.id = $1 AND p.user_id = $3
       RETURNING t.*`,
      [req.body.column_id, req.params.id, req.user?.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized access' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Move task error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    if (!req.body.title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const result = await pool.query(
      `UPDATE projects
       SET title = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [req.body.title, req.params.id, req.user?.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update project error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}
