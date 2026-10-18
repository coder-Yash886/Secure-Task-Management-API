const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

describe('Health Check Endpoints (Requirement 9)', () => {
  afterAll(async () => {
   
  });

  it('GET /health - should return 200 and basic server health info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data).toHaveProperty('uptime');
  });

  it('GET /api/v1/health - should return 200 and verify database connectivity', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.api.status).toBe('UP');
    expect(res.body.data.database.status).toBe('CONNECTED');
  });
});
