const request = require('supertest');
const app = require('../src/server');

describe('Health Endpoints', () => {
  it('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /health/ready → 200', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('GET /health/live → 200', async () => {
    const res = await request(app).get('/health/live');
    expect(res.statusCode).toBe(200);
    expect(res.body.alive).toBe(true);
  });
});

describe('Tasks API', () => {
  let createdId;

  it('GET /api/v1/tasks → returns array', async () => {
    const res = await request(app).get('/api/v1/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/tasks → creates task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Test Task' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe('Test Task');
    createdId = res.body.data.id;
  });

  it('POST /api/v1/tasks → 422 on empty title', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ title: '' });
    expect(res.statusCode).toBe(422);
  });

  it('GET /api/v1/tasks/:id → returns task', async () => {
    const res = await request(app).get(`/api/v1/tasks/${createdId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(createdId);
  });

  it('PUT /api/v1/tasks/:id → updates task', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${createdId}`)
      .send({ title: 'Updated Task', completed: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.completed).toBe(true);
  });

  it('DELETE /api/v1/tasks/:id → deletes task', async () => {
    const res = await request(app).delete(`/api/v1/tasks/${createdId}`);
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/v1/tasks/:id → 404 after delete', async () => {
    const res = await request(app).get(`/api/v1/tasks/${createdId}`);
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/stats → returns stats', async () => {
    const res = await request(app).get('/api/v1/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('total');
  });
});
