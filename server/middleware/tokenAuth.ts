import { Request, Response, NextFunction } from 'express'
import { pool } from '../db/index.js'

export async function tokenAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.split(' ')[1]

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.is_admin as "isAdmin"
       FROM users u
       JOIN api_tokens t ON t.user_id = u.id
       WHERE t.token = $1`,
      [token],
    )

    if (result.rows.length > 0) {
      // Update last_used_at
      await pool.query('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = $1', [
        token,
      ])

      req.user = result.rows[0]
      req.isApiToken = true
    }
    next()
  } catch (error) {
    console.error('Token auth error:', error)
    next()
  }
}
