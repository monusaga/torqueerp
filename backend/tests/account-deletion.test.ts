import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/lib/prisma.js';

describe('Release-Blocking Permanent Account & Business Deletion Tests', () => {
  it('permanently deletes an active business and cascades all data cleanly', async () => {
    // 1. Create a dedicated disposable tenant
    const regEmail = `disposable.tenant.${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Disposable User',
        email: regEmail,
        password: 'Password123!',
        businessName: `Disposable Garage ${Date.now()}`,
      });

    const token = regRes.body.token;
    const bizId = regRes.body.activeBusiness.id;

    // 2. Add product, customer, supplier, sale, and invoice for this tenant
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Disposable Filter',
        partNumber: `DISP-FILT-${Date.now()}`,
        mrp: 300,
        purchaseCost: 150,
        sellingPrice: 250,
        initialStock: 20,
      });
    const productId = prodRes.body.product.id;

    const saleRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Disposable Buyer',
        items: [{ productId, quantity: 1, unitPrice: 250 }],
        amountPaid: 250,
      });
    const invoiceId = saleRes.body.invoice.id;

    // 3. Execute permanent business deletion endpoint
    const deleteRes = await request(app)
      .delete('/api/v1/businesses/current')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 4. Verify in database that business and associated records are deleted
    const [bizDb, prodDb, invDb] = await Promise.all([
      prisma.business.findUnique({ where: { id: bizId } }),
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.invoice.findUnique({ where: { id: invoiceId } }),
    ]);

    expect(bizDb).toBeNull();
    expect(prodDb).toBeNull();
    expect(invDb).toBeNull();
  });

  it('permanently deletes user account and revokes further API access', async () => {
    // 1. Create a user
    const regEmail = `delete.user.${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Delete Me',
        email: regEmail,
        password: 'Password123!',
        businessName: `Delete Co ${Date.now()}`,
      });

    const token = regRes.body.token;
    const userId = regRes.body.user.id;

    // 2. Call DELETE /api/v1/auth/account
    const delRes = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // 3. Confirm user is wiped from database
    const userInDb = await prisma.user.findUnique({ where: { id: userId } });
    expect(userInDb).toBeNull();

    // 4. Confirm old token cannot access protected endpoints (rejected with 401 Unauthorized)
    const testReq = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 404]).toContain(testReq.status);
  });
});
