import { readdir, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serverDir = join(__dirname, '../dist/server')

async function* getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const res = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* getFiles(res)
    } else if (entry.name.endsWith('.js')) {
      yield res
    }
  }
}

async function fixImports() {
  for await (const filePath of getFiles(serverDir)) {
    let content = await readFile(filePath, 'utf8')

    // Add .js extension to relative imports if they don't already have it
    content = content.replace(/from ['"](\.[^'"]+)['"](?!\s*;)/g, (match, p1) => {
      // Don't add .js if it's already there
      if (p1.endsWith('.js')) {
        return match
      }
      return `from '${p1}.js'`
    })

    await writeFile(filePath, content)
  }
}

fixImports().catch(console.error)
