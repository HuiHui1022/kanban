import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { tokenAuth } from './tokenAuth.js'

export default async function auth(req: Request, res: Response, next: NextFunction) {
  // First try token authentication
  await tokenAuth(req, res, async () => {
    // If token auth didn't set a user, try JWT auth
    if (!req.user) {
      const token = req.cookies?.token

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret)
        req.user = decoded as { id: string; isAdmin: boolean }
      } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
    }
    next()
  })
}

export const requireAuth = auth

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
