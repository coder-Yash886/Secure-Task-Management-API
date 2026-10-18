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
    liveUrl: 'https://secure-task.yashkumar.me',
  });
});

app.get('/api/v1/docs', (req, res) => {
  return sendSuccess(res, 200, 'TaskFlow API Documentation & Endpoint Specification', {
    name: 'TaskFlow - Secure Task Management API',
    version: '1.0.0',
    baseUrl: 'https://secure-task.yashkumar.me/api/v1',
    authentication: 'Bearer Token (JWT in Authorization header)',
    endpoints: {
      health: [
        { method: 'GET', path: '/health', description: 'Server status & uptime', auth: false },
        { method: 'GET', path: '/api/v1/health', description: 'Deep health check with live database connectivity', auth: false }
      ],
      auth: [
        { method: 'POST', path: '/api/v1/auth/register', description: 'Register a new user account', body: ['name', 'email', 'password'], auth: false },
        { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate user & issue JWT', body: ['email', 'password'], auth: false },
        { method: 'GET', path: '/api/v1/auth/me', description: 'Fetch authenticated user profile', auth: true }
      ],
      projects: [
        { method: 'POST', path: '/api/v1/projects', description: 'Create a new project (creator becomes owner)', body: ['title', 'description (opt)'], auth: true },
        { method: 'GET', path: '/api/v1/projects', description: 'List projects where user is owner or member', auth: true },
        { method: 'GET', path: '/api/v1/projects/:id', description: 'Get project details with member list', auth: true },
        { method: 'PUT', path: '/api/v1/projects/:id', description: 'Update project (owner only)', body: ['title', 'description'], auth: true },
        { method: 'DELETE', path: '/api/v1/projects/:id', description: 'Delete project and cascade tasks (owner only)', auth: true },
        { method: 'POST', path: '/api/v1/projects/:id/members', description: 'Add team member by email', body: ['email', 'role (opt)'], auth: true }
      ],
      tasks: [
        { method: 'POST', path: '/api/v1/projects/:projectId/tasks', description: 'Create task in project', body: ['title', 'description (opt)', 'assignedTo (opt)', 'dueDate (opt)'], auth: true },
        { method: 'GET', path: '/api/v1/tasks', description: 'List accessible tasks with filtering, search, sorting & pagination', queryParams: ['status', 'assignedTo', 'search', 'sortBy', 'order', 'page', 'limit'], auth: true },
        { method: 'GET', path: '/api/v1/tasks/:id', description: 'Get task details by ID', auth: true },
        { method: 'PUT', path: '/api/v1/tasks/:id', description: 'Update task title, description, due date or assignee', auth: true },
        { method: 'PATCH', path: '/api/v1/tasks/:id/status', description: 'Update status (TODO | IN_PROGRESS | DONE) with audit log', body: ['status'], auth: true },
        { method: 'GET', path: '/api/v1/tasks/:id/history', description: 'Retrieve audit trail of all status transitions', auth: true },
        { method: 'DELETE', path: '/api/v1/tasks/:id', description: 'Delete task', auth: true }
      ]
    }
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
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects/:projectId/tasks', taskRoutes);
app.use('/api/v1/tasks', taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
