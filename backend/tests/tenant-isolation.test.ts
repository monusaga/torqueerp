import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Mandatory Release-Blocking Multi-Tenant Isolation & IDOR Tests', () => {
  let tokenA: string;
  let tokenB: string;
  let businessAId: string;
  let businessBId: string;
  let productAId: string;
  let productBId: string;
  let invoiceBId: string;
  let customerBId: string;
  let supplierBId: string;

  beforeAll(async () => {
    // 1. Authenticate Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.a@example.com', password: 'password123' });
    
    tokenA = resA.body.token;
    businessAId = resA.body.activeBusiness.id;

    // 2. Authenticate Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.b@example.com', password: 'password123' });

    tokenB = resB.body.token;
    businessBId = resB.body.activeBusiness.id;

    // 3. Create fresh product for Tenant A
    const createProdARes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: `Tenant A Exclusive Part ${Date.now()}`,
        partNumber: `T-A-PART-${Date.now()}`,
        mrp: 600,
        purchaseCost: 400,
        sellingPrice: 550,
        initialStock: 20,
      });
    productAId = createProdARes.body.product.id;

    // 4. Create fresh product for Tenant B
    const createProdBRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: `Tenant B Secret Part ${Date.now()}`,
        partNumber: `T-B-PART-${Date.now()}`,
        mrp: 900,
        purchaseCost: 600,
        sellingPrice: 850,
        initialStock: 30,
      });
    productBId = createProdBRes.body.product.id;

    // 5. Create customer for Tenant B
    const custBRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: 'Tenant B Private Client',
        phone: '+919888877777',
        vehicleNumber: 'KA 01 AB 1234',
      });
    customerBId = custBRes.body.customer.id;

    // 6. Create supplier for Tenant B
    const suppBRes = await request(app)
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: `Tenant B Secret Distributor ${Date.now()}`,
        phone: '+919777766666',
        defaultDiscountPercent: 25,
      });
    supplierBId = suppBRes.body.supplier.id;

    // 7. Create sale & invoice for Tenant B
    const saleBRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        customerId: customerBId,
        items: [{ productId: productBId, quantity: 1, unitPrice: 850 }],
        amountPaid: 850,
      });
    invoiceBId = saleBRes.body.invoice.id;
  });

  it('verifies Tenant A product catalog never lists Tenant B products', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const hasTenantBProduct = res.body.data.some((p: any) => p.id === productBId);
    expect(hasTenantBProduct).toBe(false);
  });

  it('blocks Tenant A from accessing Tenant B product details via IDOR (404/403)', async () => {
    const res = await request(app)
      .get(`/api/v1/products/${productBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.product).toBeUndefined();
  });

  it('blocks Tenant A from mutating Tenant B product prices via PUT (404/403)', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sellingPrice: 1 });

    expect([403, 404]).toContain(res.status);
  });

  it('blocks Tenant A from reading Tenant B invoice details via IDOR (404/403)', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${invoiceBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.invoice).toBeUndefined();
  });

  it('blocks Tenant A from downloading Tenant B PDF invoice (404/403)', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${invoiceBId}/pdf`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect([403, 404]).toContain(res.status);
  });

  it('blocks Tenant A from reading Tenant B customer record (404/403)', async () => {
    const res = await request(app)
      .get(`/api/v1/customers/${customerBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.customer).toBeUndefined();
  });

  it('blocks Tenant A from reading Tenant B customer list', async () => {
    const res = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const hasTenantBCust = res.body.data.some((c: any) => c.id === customerBId);
    expect(hasTenantBCust).toBe(false);
  });

  it('blocks Tenant A from reading Tenant B supplier list', async () => {
    const res = await request(app)
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const hasTenantBSupp = res.body.data.some((s: any) => s.id === supplierBId);
    expect(hasTenantBSupp).toBe(false);
  });

  it('blocks Tenant A from viewing Tenant B stock ledger movements', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const hasTenantBProductMovement = res.body.data.some((m: any) => m.productId === productBId);
    expect(hasTenantBProductMovement).toBe(false);
  });

  it('blocks Tenant A from viewing Tenant B dashboard KPI reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-business-id', businessBId);

    // Must block forged business header
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('blocks Tenant A from exporting Tenant B CSV dataset', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export?type=products')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-business-id', businessBId);

    expect(res.status).toBe(403);
  });

  it('blocks Tenant A from updating Tenant B business profile via forged header', async () => {
    const res = await request(app)
      .put('/api/v1/businesses/current')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-business-id', businessBId)
      .send({ name: 'Hacked Business Name' });

    expect(res.status).toBe(403);
  });

  it('blocks completely unauthenticated requests across all tenant endpoints', async () => {
    const [p, inv, cust, rep] = await Promise.all([
      request(app).get('/api/v1/products'),
      request(app).get('/api/v1/invoices'),
      request(app).get('/api/v1/customers'),
      request(app).get('/api/v1/reports/dashboard'),
    ]);

    expect(p.status).toBe(401);
    expect(inv.status).toBe(401);
    expect(cust.status).toBe(401);
    expect(rep.status).toBe(401);
  });
});
