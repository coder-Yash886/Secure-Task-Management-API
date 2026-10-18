const { query } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const AppError = require('../utils/appError');

const register = async ({ name, email, password, role = 'user' }) => {
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rowCount > 0) {
    throw new AppError('Email is already registered. Please log in instead.', 409);
  }

  const hashedPassword = await hashPassword(password);

  const insertRes = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, hashedPassword, role]
  );

  const user = insertRes.rows[0];
  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  return { user, token };
};

const login = async ({ email, password }) => {
  const userRes = await query(
    'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
    [email]
  );

  if (userRes.rowCount === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = userRes.rows[0];
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  delete user.password_hash;

  return { user, token };
};

const getProfile = async (userId) => {
  const res = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (res.rowCount === 0) {
    throw new AppError('User not found', 404);
  }
  return res.rows[0];
};

module.exports = {
  register,
  login,
  getProfile,
};
