import pool from '../../utils/db'
import bcrypt from 'bcrypt'
import type { User } from '../../stores/users'

export interface DBUser extends Omit<User, 'password'> {
  password_hash: string
}

export async function findUserByUsername(username: string): Promise<DBUser | null> {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
  return result.rows[0] || null
}

export async function createUser(user: {
  username: string
  displayName: string
  password: string
}): Promise<DBUser> {
  const passwordHash = await bcrypt.hash(user.password, 10)

  const result = await pool.query(
    `INSERT INTO users (username, display_name, password_hash, is_admin)
     VALUES ($1, $2, $3, (SELECT COUNT(*) = 0 FROM users))
     RETURNING *`,
    [user.username, user.displayName, passwordHash],
  )

  return result.rows[0]
}

export async function validateCredentials(
  username: string,
  password: string,
): Promise<DBUser | null> {
  const user = await findUserByUsername(username)
  if (!user) return null

  const valid = await bcrypt.compare(password, user.password_hash)
  return valid ? user : null
}

export async function getSettings() {
  const result = await pool.query('SELECT * FROM settings LIMIT 1')
  return result.rows[0] || { allow_signup: true }
}

export async function updateSettings(settings: { allowSignup: boolean }) {
  await pool.query('UPDATE settings SET allow_signup = $1, updated_at = CURRENT_TIMESTAMP', [
    settings.allowSignup,
  ])
}
