const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { pool } = require('./config/db');
const { sendSuccess } = require('./utils/response');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();


app.use(helmet());
app.use(cors());


if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  return sendSuccess(res, 200, 'Welcome to TaskFlow - Secure Task Management API', {
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health',
  });
});

app.get('/health', (req, res) => {
  return sendSuccess(res, 200, 'Server is healthy', {
    status: 'UP',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/health', async (req, res, next) => {
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatencyMs = Date.now() - dbStart;

    return sendSuccess(res, 200, 'API and Database are operational', {
      api: {
        status: 'UP',
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
      },
      database: {
        status: 'CONNECTED',
        latency: `${dbLatencyMs}ms`,
      },
    });
  } catch (error) {
    next(error);
  }
});


const authRoutes = require('./routes/auth.routes');

app.use('/api/v1/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
