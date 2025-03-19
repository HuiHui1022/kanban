import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '13008', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  db: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kanban',
  },
  client: {
    url: process.env.CLIENT_URL || (isProduction ? '*' : 'http://localhost:13008'),
  },
  cookie: {
    secure: false,
    sameSite: 'strict' as const,
    path: '/api',
  },
}

// Add debug logging for configuration
if (process.env.DEBUG) {
  console.log('[Debug] App Configuration:', {
    env: config.env,
    port: config.port,
    clientUrl: config.client.url,
    cookieSettings: config.cookie,
  })
}
