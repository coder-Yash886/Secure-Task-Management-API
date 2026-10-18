const request = require('supertest');
const app = require('../src/app');

describe('Project Management & Authorization Tests (Requirement 2 & 4)', () => {
  const uniqueId = Date.now();
  let userAToken = '';
  let userBToken = '';
  let createdProjectId = '';

  beforeAll(async () => {
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User A',
        email: `usera_${uniqueId}@example.com`,
        password: 'Password123',
      });
    userAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User B',
        email: `userb_${uniqueId}@example.com`,
        password: 'Password123',
      });
    userBToken = resB.body.data.token;
  });

  it('POST /api/v1/projects - should create a project with creator as owner', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Project Alpha',
        description: 'First test project description',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Project Alpha');
    createdProjectId = res.body.data.id;
  });

  it('GET /api/v1/projects - should list projects for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/projects/:id - should get project details for project member/owner', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdProjectId);
    expect(res.body.data.currentUserRole).toBe('owner');
  });

  it('GET /api/v1/projects/:id - should forbid unauthorized User B with 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/v1/projects/:id - should allow project owner to update project', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Project Alpha (Renamed)',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Project Alpha (Renamed)');
  });

  it('DELETE /api/v1/projects/:id - should allow project owner to delete project', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
