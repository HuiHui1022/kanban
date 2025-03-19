import { Request, Response } from 'express'
import { pool } from '../db/index.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

interface Column {
  id: string
  project_id: string
  title: string
  order: number
}

interface Task {
  id: string
  column_id: string
  title: string
  description: string
  order: number
}

const debug = (...args: any[]) => {
  if (process.env.DEBUG) {
    console.log('[Users Debug]', ...args)
  }
}

export async function getUserCount(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users')
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('Error getting user count:', error)
    res.status(500).json({ error: 'Failed to get user count' })
  }
}

export async function register(req: Request, res: Response) {
  try {
    // First check if signups are allowed
    const settingsResult = await pool.query('SELECT allow_signup FROM settings LIMIT 1')
    const allowSignup = settingsResult.rows[0]?.allow_signup ?? true

    // Get user count to determine if this is the first user
    const countResult = await pool.query('SELECT COUNT(*) FROM users')
    const isFirstUser = parseInt(countResult.rows[0].count) === 0

    // Only allow signup if it's the first user or signups are enabled
    if (!isFirstUser && !allowSignup) {
      return res.status(403).json({ error: 'New user registration is currently disabled' })
    }

    const { username, password, displayName } = req.body

    // Validate input
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [
      username.trim(),
    ])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user (first user is admin)
    const result = await pool.query(
      'INSERT INTO users (username, display_name, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, is_admin',
      [username.trim(), displayName || username.trim(), hashedPassword, isFirstUser],
    )

    const user = result.rows[0]
    const token = jwt.sign(
      {
        id: user.id,
        isAdmin: user.is_admin,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' },
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: process.env.NODE_ENV === 'production' ? '192.168.0.131' : undefined,
    })

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: user.is_admin,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: false, // Set to false for HTTP
  sameSite: 'strict' as const, // Change to strict for better security
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/api', // Restrict to API paths only
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body
    debug('Login attempt:', { username, hasPassword: !!password })

    // Validate input
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Find user by username
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const user = result.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        isAdmin: user.is_admin,
      },
      config.jwtSecret,
      { expiresIn: '24h' },
    )

    debug('Setting cookie with options:', cookieOptions)
    res.cookie('token', token, cookieOptions)

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: user.is_admin,
      },
    })
  } catch (error) {
    debug('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/api',
  })
  res.json({ message: 'Logged out successfully' })
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const result = await pool.query(
      'SELECT id, username, display_name, is_admin FROM users WHERE id = $1',
      [req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: user.is_admin,
      },
    })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ error: 'Failed to get current user' })
  }
}

export async function getSettings(req: Request, res: Response) {
  try {
    // Allow public access to signup settings
    const result = await pool.query('SELECT allow_signup FROM settings LIMIT 1')
    const allowSignup = result.rows[0]?.allow_signup ?? true

    // If no settings exist, create default settings
    if (!result.rows.length) {
      await pool.query('INSERT INTO settings (allow_signup) VALUES (true)')
    }

    res.json({ allowSignup })
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Failed to get settings' })
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const { allowSignup } = req.body
    await pool.query('UPDATE settings SET allow_signup = $1', [allowSignup])
    res.json({ allowSignup })
  } catch (error) {
    console.error('Update settings error:', error)
    res.status(500).json({ error: 'Failed to update settings' })
  }
}

export async function exportData(req: Request, res: Response) {
  try {
    // For regular users, only export their own data
    if (!req.user?.isAdmin) {
      const projects = await pool.query('SELECT * FROM projects WHERE user_id = $1', [req.user?.id])
      const projectIds = projects.rows.map((p) => p.id)

      const columns = projectIds.length
        ? await pool.query('SELECT * FROM columns WHERE project_id = ANY($1::uuid[])', [projectIds])
        : { rows: [] }

      const columnIds = columns.rows.map((c) => c.id)
      const tasks = columnIds.length
        ? await pool.query('SELECT * FROM tasks WHERE column_id = ANY($1::uuid[])', [columnIds])
        : { rows: [] }

      return res.json({
        projects: projects.rows,
        columns: columns.rows,
        tasks: tasks.rows,
      })
    }

    // For admins, export all data
    const users = await pool.query('SELECT * FROM users')
    const projects = await pool.query('SELECT * FROM projects')
    const columns = await pool.query('SELECT * FROM columns')
    const tasks = await pool.query('SELECT * FROM tasks')

    res.json({
      users: users.rows,
      projects: projects.rows,
      columns: columns.rows,
      tasks: tasks.rows,
    })
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export data' })
  }
}

export async function importData(req: Request, res: Response) {
  const client = await pool.connect()

  try {
    // Start transaction
    await client.query('BEGIN')

    // Validate the request body
    const { projects, columns, tasks } = req.body
    if (!projects || !Array.isArray(projects)) {
      throw new Error('Invalid data: projects array is required')
    }

    // Clear existing data for the user
    await client.query(
      'DELETE FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1))',
      [req.user?.id],
    )
    await client.query(
      'DELETE FROM columns WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)',
      [req.user?.id],
    )
    await client.query('DELETE FROM projects WHERE user_id = $1', [req.user?.id])

    // Insert new data
    for (const project of projects) {
      const projectResult = await client.query(
        'INSERT INTO projects (title, description, user_id) VALUES ($1, $2, $3) RETURNING id',
        [project.title, project.description || '', req.user?.id],
      )
      const projectId = projectResult.rows[0].id

      // Insert columns if they exist
      if (columns && Array.isArray(columns)) {
        const projectColumns = columns.filter((col) => col.project_id === project.id)
        for (const column of projectColumns) {
          const columnResult = await client.query(
            'INSERT INTO columns (title, project_id) VALUES ($1, $2) RETURNING id',
            [column.title, projectId],
          )
          const columnId = columnResult.rows[0].id

          // Insert tasks if they exist
          if (tasks && Array.isArray(tasks)) {
            const columnTasks = tasks.filter((task) => task.column_id === column.id)
            for (const task of columnTasks) {
              await client.query(
                'INSERT INTO tasks (title, description, column_id, priority, due_date) VALUES ($1, $2, $3, $4, $5)',
                [
                  task.title,
                  task.description || '',
                  columnId,
                  task.priority || 'none',
                  task.due_date || null,
                ],
              )
            }
          }
        }
      }
    }

    await client.query('COMMIT')
    res.json({ message: 'Data imported successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Import error:', error)
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to import data' })
  } finally {
    client.release()
  }
}
