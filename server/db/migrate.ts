import pkg from 'pg'
import { config } from '../config.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pool = new Pool({
  connectionString: config.db.url,
})

async function runMigrations() {
  // Create migrations table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Get all migration files
  const migrationFiles = fs
    .readdirSync(path.join(__dirname, 'migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  // Get executed migrations
  const { rows: executedMigrations } = await pool.query('SELECT name FROM migrations')
  const executedMigrationNames = executedMigrations.map((row) => row.name)

  // Run pending migrations
  for (const file of migrationFiles) {
    if (!executedMigrationNames.includes(file)) {
      const migrationContent = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf-8')

      console.log(`Running migration: ${file}`)

      await pool.query('BEGIN')
      try {
        await pool.query(migrationContent)
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file])
        await pool.query('COMMIT')
        console.log(`Migration ${file} completed successfully`)
      } catch (error) {
        await pool.query('ROLLBACK')
        console.error(`Migration ${file} failed:`, error)
        process.exit(1)
      }
    } else {
      console.log(`Skipping migration ${file} - already executed`)
    }
  }

  await pool.end()
}

runMigrations().catch((error) => {
  console.error('Migration runner failed:', error)
  process.exit(1)
})
