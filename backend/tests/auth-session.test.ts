import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Authentication, Session & Access Control Security Tests', () => {
  const testEmail = `test.user.${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let validToken: string;

  it('registers a new business account and user atomically', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Rajesh Motors',
        email: testEmail,
        password: testPassword,
        businessName: 'Rajesh Auto Spares',
        phone: '+919876543210',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.activeBusiness.name).toBe('Rajesh Auto Spares');
    validToken = res.body.token;
  });

  it('rejects duplicate registration with same email (HTTP 409)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another User',
        email: testEmail,
        password: testPassword,
        businessName: 'Duplicate Motors',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_EXISTS');
  });

  it('authenticates valid credentials and returns JWT session token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
  });

  it('rejects invalid password with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects non-existent email with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nobody@nonexistent.domain',
        password: testPassword,
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('fetches user profile and active memberships via /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.businesses.length).toBeGreaterThanOrEqual(1);
    expect(res.body.businesses[0].role).toBe('OWNER');
  });

  it('rejects protected routes when Authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects protected routes when JWT token is malformed', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', 'Bearer malformed.jwt.token');

    expect(res.status).toBe(401);
  });

  it('rejects Google SSO attempts that supply only an email address (no Google credential)', async () => {
    // A plain Gmail address must NEVER authenticate anyone. Real Google login
    // requires a server-verified Google ID token (see tests/google-auth.test.ts).
    const googleEmail = `google.user.${Date.now()}@gmail.com`;

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({
        email: googleEmail,
        name: 'Arjun Auto Tech',
        businessName: 'Arjun Royal Spares',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_CREDENTIAL_REQUIRED');
    expect(res.body.token).toBeUndefined();
  });

  it('invalidates the session server-side on logout', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe('SESSION_INVALIDATED');
  });
});
