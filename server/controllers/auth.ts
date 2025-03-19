import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/index.js'
import { config } from '../config.js'

export async function register(req: Request, res: Response) {
  try {
    const { username, password, displayName } = req.body
    console.log('Registration attempt for:', username)

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Check if this is the first user
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const isFirstUser = parseInt(userCount.rows[0].count) === 0

    // Create user with admin status if first user
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (username, display_name, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, is_admin',
      [username, displayName, hashedPassword, isFirstUser],
    )
    const user = result.rows[0]

    // Generate token
    const token = jwt.sign({ id: user.id, isAdmin: user.is_admin }, config.jwtSecret, {
      expiresIn: '7d',
    })

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.status(201).json({
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

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate token
    const token = jwt.sign({ id: user.id, isAdmin: user.is_admin }, config.jwtSecret, {
      expiresIn: '7d',
    })

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('token')
  res.json({ message: 'Logged out successfully' })
}
