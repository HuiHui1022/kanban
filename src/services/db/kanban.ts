import pool from '../../utils/db'
import type { Project, Column, Task } from '../../stores/kanban'

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  const result = await pool.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY "order"', [
    userId,
  ])
  return result.rows
}

export async function createProject(project: {
  title: string
  userId: string
  order: number
}): Promise<Project> {
  const result = await pool.query(
    `INSERT INTO projects (title, user_id, "order")
     VALUES ($1, $2, $3)
     RETURNING *`,
    [project.title, project.userId, project.order],
  )
  return result.rows[0]
}

export async function getColumnsByProjectId(projectId: string): Promise<Column[]> {
  const result = await pool.query('SELECT * FROM columns WHERE project_id = $1 ORDER BY "order"', [
    projectId,
  ])
  return result.rows
}

export async function createColumn(column: {
  title: string
  projectId: string
  order: number
}): Promise<Column> {
  const result = await pool.query(
    `INSERT INTO columns (title, project_id, "order")
     VALUES ($1, $2, $3)
     RETURNING *`,
    [column.title, column.projectId, column.order],
  )
  return result.rows[0]
}

export async function getTasksByColumnId(columnId: string): Promise<Task[]> {
  const result = await pool.query('SELECT * FROM tasks WHERE column_id = $1 ORDER BY "order"', [
    columnId,
  ])
  return result.rows
}

export async function createTask(task: {
  title: string
  description: string
  columnId: string
  order: number
}): Promise<Task> {
  const result = await pool.query(
    `INSERT INTO tasks (title, description, column_id, "order")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [task.title, task.description, task.columnId, task.order],
  )
  return result.rows[0]
}

export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'id'>>,
): Promise<Task> {
  const setClauses = []
  const values = [taskId]
  let paramIndex = 2

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  }

  const result = await pool.query(
    `UPDATE tasks
     SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    values,
  )
  return result.rows[0]
}

export async function deleteTask(taskId: string): Promise<void> {
  await pool.query('DELETE FROM tasks WHERE id = $1', [taskId])
}

export async function deleteProject(projectId: string): Promise<void> {
  await pool.query('DELETE FROM projects WHERE id = $1', [projectId])
}

export async function updateColumn(columnId: string, title: string): Promise<Column> {
  const result = await pool.query('UPDATE columns SET title = $1 WHERE id = $2 RETURNING *', [
    title,
    columnId,
  ])
  return result.rows[0]
}

export async function deleteColumn(columnId: string): Promise<void> {
  await pool.query('DELETE FROM columns WHERE id = $1', [columnId])
}

export async function updateTaskOrder(taskId: string, order: number): Promise<void> {
  await pool.query('UPDATE tasks SET "order" = $1 WHERE id = $2', [order, taskId])
}

export async function updateProjectOrder(projectId: string, order: number): Promise<void> {
  await pool.query('UPDATE projects SET "order" = $1 WHERE id = $2', [order, projectId])
}

export async function updateColumnOrder(columnId: string, order: number): Promise<void> {
  await pool.query('UPDATE columns SET "order" = $1 WHERE id = $2', [order, columnId])
}

export async function moveTaskToColumn(
  taskId: string,
  columnId: string,
  order: number,
): Promise<Task> {
  const result = await pool.query(
    `UPDATE tasks
     SET column_id = $1, "order" = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [columnId, order, taskId],
  )
  return result.rows[0]
}

export async function bulkUpdateTaskOrders(
  updates: Array<{ id: string; order: number }>,
): Promise<void> {
  // Use a transaction for bulk updates
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const { id, order } of updates) {
      await client.query('UPDATE tasks SET "order" = $1 WHERE id = $2', [order, id])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function bulkUpdateProjectOrders(
  updates: Array<{ id: string; order: number }>,
): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const { id, order } of updates) {
      await client.query('UPDATE projects SET "order" = $1 WHERE id = $2', [order, id])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function bulkUpdateColumnOrders(
  updates: Array<{ id: string; order: number }>,
): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const { id, order } of updates) {
      await client.query('UPDATE columns SET "order" = $1 WHERE id = $2', [order, id])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Add function to get all data for a user (useful for admin exports)
export async function getAllUserData(userId: string): Promise<{
  projects: Project[]
  columns: Column[]
  tasks: Task[]
}> {
  const client = await pool.connect()
  try {
    const projects = (await client.query('SELECT * FROM projects WHERE user_id = $1', [userId]))
      .rows

    const projectIds = projects.map((p) => p.id)
    const columns = projectIds.length
      ? (
          await client.query('SELECT * FROM columns WHERE project_id = ANY($1::uuid[])', [
            projectIds,
          ])
        ).rows
      : []

    const columnIds = columns.map((c) => c.id)
    const tasks = columnIds.length
      ? (await client.query('SELECT * FROM tasks WHERE column_id = ANY($1::uuid[])', [columnIds]))
          .rows
      : []

    return { projects, columns, tasks }
  } finally {
    client.release()
  }
}

// Add other necessary database operations...
