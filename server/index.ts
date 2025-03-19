import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import routes from './routes/index.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { config } from './config.js'
import apiRouter from './routes/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

// Add debug logging
const debug = (...args: any[]) => {
  if (process.env.DEBUG) {
    console.log('[Debug]', ...args)
  }
}

async function createServer() {
  const app = express()

  app.use(express.json())
  app.use(cookieParser())
  app.use(
    cors({
      origin: function (origin, callback) {
        debug('CORS Request Origin:', origin)

        // Allow all origins in production and development
        callback(null, true)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    }),
  )

  // Add request logging middleware
  app.use((req, res, next) => {
    debug(`${req.method} ${req.url}`, {
      headers: req.headers,
      cookies: req.cookies,
      body: req.body,
    })
    next()
  })

  // Auth and admin routes
  app.use('/api', routes)

  // Kanban API routes
  app.use('/api', apiRouter)

  // Serve static files in production
  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, '../../dist')))

    // Handle SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../../dist/index.html'))
    })
  }

  const port = config.port || 13008
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`)
    debug('Server configuration:', {
      nodeEnv: process.env.NODE_ENV,
      port,
      clientUrl: config.client.url,
    })
  })
}

createServer().catch(console.error)
