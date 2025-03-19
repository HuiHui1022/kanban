import { Request, Response } from 'express'
import { pool } from '../db/index.js'
import crypto from 'crypto'

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createToken(req: Request, res: Response) {
  try {
    const { name } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Token name is required' })
    }

    // Check if token with this name already exists for user
    const existingToken = await pool.query(
      'SELECT id FROM api_tokens WHERE user_id = $1 AND name = $2',
      [req.user?.id, name],
    )

    if (existingToken.rows.length > 0) {
      return res.status(400).json({ error: 'Token with this name already exists' })
    }

    const token = generateToken()

    const result = await pool.query(
      `INSERT INTO api_tokens (user_id, name, token)
       VALUES ($1, $2, $3)
       RETURNING id, name, created_at`,
      [req.user?.id, name, token],
    )

    // Return the token only once - it won't be retrievable later
    res.status(201).json({
      ...result.rows[0],
      token,
    })
  } catch (error) {
    console.error('Create token error:', error)
    res.status(500).json({ error: 'Failed to create token' })
  }
}

export async function listTokens(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at, last_used_at
       FROM api_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user?.id],
    )
    res.json(result.rows)
  } catch (error) {
    console.error('List tokens error:', error)
    res.status(500).json({ error: 'Failed to list tokens' })
  }
}

export async function deleteToken(req: Request, res: Response) {
  try {
    const result = await pool.query(
      'DELETE FROM api_tokens WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user?.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' })
    }

    res.json({ message: 'Token deleted successfully' })
  } catch (error) {
    console.error('Delete token error:', error)
    res.status(500).json({ error: 'Failed to delete token' })
  }
}
