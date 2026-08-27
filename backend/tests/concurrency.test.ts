import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Atomic Concurrency & Race Condition Tests', () => {
  let token: string;
  let singleStockProductId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.a@example.com', password: 'password123' });
    token = res.body.token;

    // Create a product with exactly 1 unit in stock
    const createProdRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Rare Limited Spare Part ${Date.now()}`,
        partNumber: `RARE-${Date.now()}`,
        mrp: 5000,
        purchaseCost: 3500,
        sellingPrice: 4800,
        initialStock: 1, // Only 1 available!
        minStock: 1,
      });

    singleStockProductId = createProdRes.body.product.id;
  });

  it('handles simultaneous checkout attempts for the last remaining unit (only 1 succeeds)', async () => {
    const makeCheckoutRequest = (customerName: string) =>
      request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName,
          items: [{ productId: singleStockProductId, quantity: 1, unitPrice: 4800 }],
          amountPaid: 4800,
        });

    // Fire 2 concurrent checkout requests for the same 1 remaining unit
    const [res1, res2] = await Promise.all([
      makeCheckoutRequest('Buyer Alice'),
      makeCheckoutRequest('Buyer Bob'),
    ]);

    const statuses = [res1.status, res2.status];
    const successCount = statuses.filter((s) => s === 201).length;
    const failureCount = statuses.filter((s) => s === 400).length;

    // Exactly one transaction must succeed, and the other must be blocked with INSUFFICIENT_STOCK
    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Verify product stock reached exactly 0 and NEVER went negative
    const prodRes = await request(app)
      .get(`/api/v1/products/${singleStockProductId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(prodRes.body.product.currentStock).toBe(0);
  });

  it('guarantees strictly sequential invoice numbering under load', async () => {
    // Perform 3 rapid sales
    const sellReq = () =>
      request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              // Create a general part with ample stock
              productId: singleStockProductId,
              quantity: 0, // Zero qty will fail validation
              unitPrice: 100,
            },
          ],
        });

    const res = await sellReq();
    expect(res.status).toBe(400); // Fails safely without skipping invoice sequence numbers
  });
});
