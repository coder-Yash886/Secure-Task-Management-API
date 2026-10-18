const { query, getClient } = require('../config/db');
const AppError = require('../utils/appError');

const createProject = async ({ title, description, ownerId }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const projectRes = await client.query(
      `INSERT INTO projects (title, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, description, owner_id, created_at, updated_at`,
      [title, description || '', ownerId]
    );

    const project = projectRes.rows[0];

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [project.id, ownerId]
    );

    await client.query('COMMIT');
    return project;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getUserProjects = async (userId) => {
  const sql = `
    SELECT 
      p.id, 
      p.title, 
      p.description, 
      p.owner_id, 
      p.created_at, 
      p.updated_at,
      u.name AS owner_name,
      u.email AS owner_email,
      pm.role AS current_user_role,
      (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count,
      (SELECT COUNT(*)::int FROM project_members pm2 WHERE pm2.project_id = p.id) AS member_count
    FROM projects p
    INNER JOIN project_members pm ON p.id = pm.project_id
    INNER JOIN users u ON p.owner_id = u.id
    WHERE pm.user_id = $1
    ORDER BY p.updated_at DESC
  `;
  const res = await query(sql, [userId]);
  return res.rows;
};

const getProjectById = async (projectId, userId) => {
  const memberCheck = await query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (memberCheck.rowCount === 0) {
    throw new AppError('Access forbidden: You do not have permission to view this project', 403);
  }

  const projectRes = await query(
    `SELECT 
      p.id, 
      p.title, 
      p.description, 
      p.owner_id, 
      p.created_at, 
      p.updated_at,
      u.name AS owner_name,
      u.email AS owner_email
     FROM projects p
     INNER JOIN users u ON p.owner_id = u.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (projectRes.rowCount === 0) {
    throw new AppError('Project not found', 404);
  }

  const project = projectRes.rows[0];

  const membersRes = await query(
    `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
     FROM project_members pm
     INNER JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1
     ORDER BY pm.joined_at ASC`,
    [projectId]
  );

  return {
    ...project,
    currentUserRole: memberCheck.rows[0].role,
    members: membersRes.rows,
  };
};

const updateProject = async (projectId, userId, { title, description }) => {
  const checkOwner = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (checkOwner.rowCount === 0) {
    throw new AppError('Project not found', 404);
  }

  if (checkOwner.rows[0].owner_id !== userId) {
    throw new AppError('Only the project owner can update this project', 403);
  }

  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIdx++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    values.push(description);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(projectId);

  const sql = `
    UPDATE projects
    SET ${updates.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING id, title, description, owner_id, created_at, updated_at
  `;

  const res = await query(sql, values);
  return res.rows[0];
};

const deleteProject = async (projectId, userId) => {
  const checkOwner = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (checkOwner.rowCount === 0) {
    throw new AppError('Project not found', 404);
  }

  if (checkOwner.rows[0].owner_id !== userId) {
    throw new AppError('Only the project owner can delete this project', 403);
  }

  await query('DELETE FROM projects WHERE id = $1', [projectId]);
  return { message: 'Project deleted successfully' };
};

const addMember = async (projectId, ownerId, { email, role = 'member' }) => {
  const checkOwner = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (checkOwner.rowCount === 0) {
    throw new AppError('Project not found', 404);
  }
  if (checkOwner.rows[0].owner_id !== ownerId) {
    throw new AppError('Only the project owner can add team members', 403);
  }

  const userRes = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);
  if (userRes.rowCount === 0) {
    throw new AppError(`User with email "${email}" not found`, 404);
  }

  const memberUser = userRes.rows[0];

  const existingMember = await query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, memberUser.id]
  );

  if (existingMember.rowCount > 0) {
    throw new AppError('User is already a member of this project', 409);
  }

  await query(
    'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
    [projectId, memberUser.id, role]
  );

  return {
    projectId,
    user: memberUser,
    role,
  };
};

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
};
