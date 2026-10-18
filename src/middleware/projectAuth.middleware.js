const { query } = require('../config/db');
const AppError = require('../utils/appError');

/**
 * Ensures user has access to a project (as owner or member)
 * @param {string} requiredRole - 'member' (default) or 'owner'
 */
const requireProjectAccess = (requiredRole = 'member') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id;
      const userId = req.user.id;

      if (!projectId) {
        throw new AppError('Project ID is required', 400);
      }

  
      const projectRes = await query(
        'SELECT id, title, description, owner_id, created_at, updated_at FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectRes.rowCount === 0) {
        throw new AppError('Project not found', 404);
      }

      const project = projectRes.rows[0];

 
      if (project.owner_id === userId) {
        req.project = project;
        req.userProjectRole = 'owner';
        return next();
      }

 
      if (requiredRole === 'owner') {
        throw new AppError('Only the project owner can perform this action', 403);
      }


      const memberRes = await query(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (memberRes.rowCount === 0) {
        throw new AppError('Access forbidden: You are not a member of this project', 403);
      }

      req.project = project;
      req.userProjectRole = memberRes.rows[0].role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireProjectAccess,
};
