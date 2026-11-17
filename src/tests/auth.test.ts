import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers';
import { TEST_ADMIN } from './setup';

const credentials = { email: TEST_ADMIN.email, password: TEST_ADMIN.password };

describe('Authentication', () => {
  it('logs in with valid credentials and sets an HTTP-only cookie', async () => {
    const res = await request(makeApp()).post('/api/v1/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(TEST_ADMIN.email);
    expect(res.body.data.user).not.toHaveProperty('password');
    const cookie = res.headers['set-cookie']?.[0];
    expect(cookie).toContain('dt_access_token=');
    expect(cookie).toContain('HttpOnly');
  });

  it('rejects an invalid password', async () => {
    const res = await request(makeApp())
      .post('/api/v1/auth/login')
      .send({ email: TEST_ADMIN.email, password: 'WrongPassword123!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid input', async () => {
    const res = await request(makeApp()).post('/api/v1/auth/login').send({ email: 'nope', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('email');
    expect(res.body.error.details).toHaveProperty('password');
  });

  it('returns the current admin for /auth/me', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/api/v1/auth/login').send(credentials);
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('blocks protected routes without a token', async () => {
    const res = await request(makeApp()).get('/api/v1/doctors');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a forged token', async () => {
    const res = await request(makeApp())
      .get('/api/v1/doctors')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('logs out and clears the cookie', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/api/v1/auth/login').send(credentials);
    const res = await agent.post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toContain('dt_access_token=;');
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('exposes a public health check', async () => {
    const res = await request(makeApp()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});
