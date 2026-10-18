const request = require('supertest');
const app = require('../src/app');

describe('Task Management & Activity History Tests (Requirement 3, 5, 6 & 8)', () => {
  const uniqueId = Date.now();
  let userToken = '';
  let userId = '';
  let projectId = '';
  let taskId = '';

  beforeAll(async () => {
    // Register user
    const resUser = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Task Tester',
        email: `tasktester_${uniqueId}@example.com`,
        password: 'Password123',
      });
    userToken = resUser.body.data.token;
    userId = resUser.body.data.user.id;

    // Create a project
    const resProj = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Task Suite Project',
        description: 'For testing task features',
      });
    projectId = resProj.body.data.id;
  });

  it('POST /api/v1/projects/:projectId/tasks - should create a task and record initial history', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Build Unit Tests',
        description: 'Implement automated tests for Karya Saarthi assignment',
        status: 'TODO',
        assignedTo: userId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('TODO');
    expect(res.body.data.title).toBe('Build Unit Tests');
    taskId = res.body.data.id;
  });

  it('PATCH /api/v1/tasks/:id/status - should update task status to IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        status: 'IN_PROGRESS',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('PATCH /api/v1/tasks/:id/status - should update task status to DONE', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        status: 'DONE',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DONE');
  });

  it('GET /api/v1/tasks/:id/history - should return activity history for status transitions (Requirement 6)', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/history`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);

    // Latest status transition was IN_PROGRESS -> DONE
    const latest = res.body.data[0];
    expect(latest.old_status).toBe('IN_PROGRESS');
    expect(latest.new_status).toBe('DONE');
  });

  it('GET /api/v1/tasks - should support filtering, sorting, and pagination (Requirement 5)', async () => {
    const res = await request(app)
      .get('/api/v1/tasks?status=DONE&sortBy=created_at&order=desc&page=1&limit=5')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('DELETE /api/v1/tasks/:id - should delete the task', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
