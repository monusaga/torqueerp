import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Input Validation & Security Hardening Tests', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.a@example.com', password: 'password123' });
    token = res.body.token;
  });

  it('rejects product creation with negative MRP (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Negative Price Part',
        partNumber: `NEG-PART-${Date.now()}`,
        mrp: -500,
        purchaseCost: 200,
        sellingPrice: 400,
      });

    expect(res.status).toBe(400);
  });

  it('rejects product creation with missing name (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        partNumber: `NONAME-${Date.now()}`,
        mrp: 500,
        purchaseCost: 200,
        sellingPrice: 400,
      });

    expect(res.status).toBe(400);
  });

  it('rejects sale with empty items cart array (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [],
      });

    expect(res.status).toBe(400);
  });

  it('rejects sale with negative item quantity (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: 'mock-id', quantity: -5, unitPrice: 100 }],
      });

    expect(res.status).toBe(400);
  });

  it('rejects sale with 0 quantity (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: 'mock-id', quantity: 0, unitPrice: 100 }],
      });

    expect(res.status).toBe(400);
  });

  it('sanitizes CSV formula injection characters in data export', async () => {
    // 1. Create a product with formula injection prefix
    const injectionName = '=SUM(1+1)';
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: injectionName,
        partNumber: `FORMULA-${Date.now()}`,
        mrp: 100,
        purchaseCost: 50,
        sellingPrice: 80,
      });

    // 2. Request CSV export
    const exportRes = await request(app)
      .get('/api/v1/reports/export?type=products')
      .set('Authorization', `Bearer ${token}`);

    expect(exportRes.status).toBe(200);
    // Verified that formula injection was sanitized with leading quote
    expect(exportRes.text).toContain("\"'=SUM(1+1)\"");
  });

  it('includes security headers (Helmet) on API responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
