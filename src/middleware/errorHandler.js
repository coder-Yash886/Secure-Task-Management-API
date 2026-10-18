const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // PostgreSQL Error Codes Handling
  if (err.code === '23505') {
    // Unique violation (e.g. duplicate email)
    statusCode = 409;
    if (err.detail && err.detail.includes('email')) {
      message = 'A user with this email address already exists.';
    } else {
      message = 'Duplicate entry: A resource with this value already exists.';
    }
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist (invalid foreign key).';
  } else if (err.code === '22P02') {
    // Invalid UUID / data type
    statusCode = 400;
    message = 'Invalid ID or format provided.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  // Log 500 errors in development for debugging
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('💥 Unhandled Exception:', err);
  }

  return sendError(res, statusCode, message, errors);
};


const notFoundHandler = (req, res) => {
  return sendError(res, 404, `Endpoint not found: ${req.method} ${req.originalUrl}`);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
