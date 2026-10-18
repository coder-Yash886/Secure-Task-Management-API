const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');
const AppError = require('../utils/appError');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or malformed Bearer token', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token missing', 401);
    }

    const decoded = verifyToken(token);

    const userRes = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rowCount === 0) {
      throw new AppError('The user belonging to this token no longer exists', 401);
    }

    req.user = userRes.rows[0];
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
