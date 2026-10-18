const { query, getClient } = require('../config/db');
const AppError = require('../utils/appError');

const verifyProjectAccess = async (projectId, userId) => {
  const memberRes = await query(
    `SELECT pm.role, p.owner_id 
     FROM projects p
     LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
     WHERE p.id = $1`,
    [projectId, userId]
  );

  if (memberRes.rowCount === 0) {
    throw new AppError('Project not found', 404);
  }

  const { role, owner_id } = memberRes.rows[0];
  const hasAccess = owner_id === userId || Boolean(role);
  if (!hasAccess) {
    throw new AppError('Access forbidden: You do not have permission for this project', 403);
  }

  return { isOwner: owner_id === userId, role };
};

const createTask = async ({ projectId, title, description, status = 'TODO', assignedTo, dueDate, userId }) => {
  await verifyProjectAccess(projectId, userId);

  if (assignedTo) {
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [assignedTo]);
    if (userCheck.rowCount === 0) {
      throw new AppError('Assigned user does not exist', 400);
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const insertTaskSql = `
      INSERT INTO tasks (project_id, title, description, status, assigned_to, created_by, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, project_id, title, description, status, assigned_to, created_by, due_date, created_at, updated_at
    `;
    const taskRes = await client.query(insertTaskSql, [
      projectId,
      title,
      description || '',
      status,
      assignedTo || null,
      userId,
      dueDate || null,
    ]);

    const task = taskRes.rows[0];

    // Log initial status in task_activities
    await client.query(
      `INSERT INTO task_activities (task_id, changed_by, old_status, new_status)
       VALUES ($1, $2, NULL, $3)`,
      [task.id, userId, status]
    );

    await client.query('COMMIT');
    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getTasks = async (userId, options = {}) => {
  const {
    projectId,
    status,
    assignedTo,
    search,
    sortBy = 'created_at',
    order = 'desc',
    page = 1,
    limit = 10,
  } = options;

  const validSortColumns = {
    created_at: 't.created_at',
    due_date: 't.due_date',
    status: 't.status',
    title: 't.title',
  };
  const sortColumn = validSortColumns[sortBy] || 't.created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const whereConditions = [
    `EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = t.project_id AND pm.user_id = $1
    )`,
  ];
  const queryParams = [userId];
  let paramIdx = 2;

  if (projectId) {
    whereConditions.push(`t.project_id = $${paramIdx++}`);
    queryParams.push(projectId);
  }

  if (status) {
    whereConditions.push(`t.status = $${paramIdx++}`);
    queryParams.push(status);
  }

  if (assignedTo) {
    whereConditions.push(`t.assigned_to = $${paramIdx++}`);
    queryParams.push(assignedTo);
  }

  if (search) {
    whereConditions.push(`(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`);
    queryParams.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count for pagination metadata
  const countSql = `SELECT COUNT(*)::int AS total FROM tasks t WHERE ${whereClause}`;
  const countRes = await query(countSql, queryParams);
  const total = countRes.rows[0].total;

  const offset = (page - 1) * limit;
  queryParams.push(limit, offset);

  const tasksSql = `
    SELECT 
      t.id, 
      t.project_id, 
      p.title AS project_title,
      t.title, 
      t.description, 
      t.status, 
      t.due_date, 
      t.created_at, 
      t.updated_at,
      u_assign.id AS assigned_to_id,
      u_assign.name AS assigned_to_name,
      u_assign.email AS assigned_to_email,
      u_create.id AS created_by_id,
      u_create.name AS created_by_name
    FROM tasks t
    INNER JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u_assign ON t.assigned_to = u_assign.id
    INNER JOIN users u_create ON t.created_by = u_create.id
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  const tasksRes = await query(tasksSql, queryParams);

  return {
    tasks: tasksRes.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getTaskById = async (taskId, userId) => {
  const taskSql = `
    SELECT 
      t.id, 
      t.project_id, 
      p.title AS project_title,
      p.owner_id AS project_owner_id,
      t.title, 
      t.description, 
      t.status, 
      t.due_date, 
      t.created_at, 
      t.updated_at,
      u_assign.id AS assigned_to_id,
      u_assign.name AS assigned_to_name,
      u_assign.email AS assigned_to_email,
      u_create.id AS created_by_id,
      u_create.name AS created_by_name
    FROM tasks t
    INNER JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u_assign ON t.assigned_to = u_assign.id
    INNER JOIN users u_create ON t.created_by = u_create.id
    WHERE t.id = $1
  `;

  const taskRes = await query(taskSql, [taskId]);
  if (taskRes.rowCount === 0) {
    throw new AppError('Task not found', 404);
  }

  const task = taskRes.rows[0];
  await verifyProjectAccess(task.project_id, userId);

  return task;
};

const updateTask = async (taskId, userId, fields) => {
  await getTaskById(taskId, userId);

  if (fields.assignedTo) {
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [fields.assignedTo]);
    if (userCheck.rowCount === 0) {
      throw new AppError('Assigned user does not exist', 400);
    }
  }

  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (fields.title !== undefined) {
    updates.push(`title = $${paramIdx++}`);
    values.push(fields.title);
  }
  if (fields.description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    values.push(fields.description);
  }
  if (fields.assignedTo !== undefined) {
    updates.push(`assigned_to = $${paramIdx++}`);
    values.push(fields.assignedTo);
  }
  if (fields.dueDate !== undefined) {
    updates.push(`due_date = $${paramIdx++}`);
    values.push(fields.dueDate);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(taskId);

  const sql = `
    UPDATE tasks
    SET ${updates.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING id, project_id, title, description, status, assigned_to, due_date, created_at, updated_at
  `;

  const res = await query(sql, values);
  return res.rows[0];
};

const updateTaskStatus = async (taskId, userId, newStatus) => {
  const task = await getTaskById(taskId, userId);
  const oldStatus = task.status;

  if (oldStatus === newStatus) {
    return task;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Update task status
    const updateSql = `
      UPDATE tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, project_id, title, description, status, assigned_to, due_date, updated_at
    `;
    const res = await client.query(updateSql, [newStatus, taskId]);
    const updatedTask = res.rows[0];

    // 2. Automatically record in task_activities (Requirement 6)
    await client.query(
      `INSERT INTO task_activities (task_id, changed_by, old_status, new_status)
       VALUES ($1, $2, $3, $4)`,
      [taskId, userId, oldStatus, newStatus]
    );

    await client.query('COMMIT');
    return updatedTask;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getTaskHistory = async (taskId, userId) => {
  // Ensure access
  await getTaskById(taskId, userId);

  const sql = `
    SELECT 
      ta.id, 
      ta.task_id, 
      ta.old_status, 
      ta.new_status, 
      ta.created_at,
      u.id AS changed_by_id,
      u.name AS changed_by_name,
      u.email AS changed_by_email
    FROM task_activities ta
    LEFT JOIN users u ON ta.changed_by = u.id
    WHERE ta.task_id = $1
    ORDER BY ta.created_at DESC
  `;

  const res = await query(sql, [taskId]);
  return res.rows;
};

const deleteTask = async (taskId, userId) => {
  const task = await getTaskById(taskId, userId);

  if (task.project_owner_id !== userId && task.created_by_id !== userId) {
    throw new AppError('Only the project owner or task creator can delete this task', 403);
  }

  await query('DELETE FROM tasks WHERE id = $1', [taskId]);
  return { message: 'Task deleted successfully' };
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  getTaskHistory,
  deleteTask,
};
