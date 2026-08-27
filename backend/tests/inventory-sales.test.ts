import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Inventory, Stock Ledger & POS Lifecycle Tests', () => {
  let token: string;
  let productId: string;
  let initialStock: number;
  let initialCost: number;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.a@example.com', password: 'password123' });
    token = res.body.token;

    // Create a dedicated product with known stock
    const createProdRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `High Performance Brake Disc ${Date.now()}`,
        partNumber: `DISC-PART-${Date.now()}`,
        brand: 'Royal Enfield',
        mrp: 1200,
        purchaseCost: 800,
        sellingPrice: 1100,
        initialStock: 50,
        minStock: 5,
      });

    const p = createProdRes.body.product;
    productId = p.id;
    initialStock = p.currentStock;
    initialCost = p.purchaseCost;
  });

  it('records opening stock in stock ledger upon product creation', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const openingMovement = res.body.data.find(
      (m: any) => m.productId === productId && m.movementType === 'OPENING_STOCK'
    );
    expect(openingMovement).toBeDefined();
    expect(openingMovement.quantity).toBe(50);
  });

  it('completes a POS counter sale, atomically deducts inventory, and links invoice', async () => {
    const salePayload = {
      customerName: 'Suresh Raina',
      customerPhone: '+919812345678',
      amountPaid: 2200,
      paymentMethod: 'UPI',
      items: [
        {
          productId,
          quantity: 2,
          unitPrice: 1100,
          discountAmount: 0,
          taxRate: 0,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(salePayload);

    expect(res.status).toBe(201);
    expect(res.body.sale).toBeDefined();
    expect(res.body.invoice).toBeDefined();
    expect(res.body.sale.grandTotal).toBe(2200);
    expect(res.body.sale.totalCostCOGS).toBe(initialCost * 2); // 800 * 2 = 1600
    expect(res.body.sale.grossProfit).toBe(2200 - 1600); // 600

    // Check inventory deduction
    const prodRes = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(prodRes.body.product.currentStock).toBe(initialStock - 2);
  });

  it('records SALE stock movement audit entry in stock ledger', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${token}`);

    const saleMovement = res.body.data.find(
      (m: any) => m.productId === productId && m.movementType === 'SALE'
    );
    expect(saleMovement).toBeDefined();
    expect(saleMovement.quantity).toBe(-2);
  });

  it('blocks sale exceeding stock when negative stock is disabled (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            productId,
            quantity: 999999,
            unitPrice: 1100,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('preserves historical COGS and invoice profit figures when catalog prices change later', async () => {
    // 1. Create a sale
    const saleRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1, unitPrice: 1100 }],
        amountPaid: 1100,
      });
    const saleId = saleRes.body.sale.id;
    const originalCOGS = saleRes.body.sale.totalCostCOGS;

    // 2. Increase purchase cost and selling price in catalog
    await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        purchaseCost: 1000, // Changed from 800
        sellingPrice: 1500, // Changed from 1100
      });

    // 3. Fetch past sale and verify original COGS is preserved
    const pastSaleRes = await request(app)
      .get(`/api/v1/sales/${saleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(pastSaleRes.body.sale.totalCostCOGS).toBe(originalCOGS);
    expect(pastSaleRes.body.sale.items[0].unitCostAtSale).toBe(initialCost);
  });

  it('supports idempotencyKey replay to prevent duplicate billing or double stock deduction', async () => {
    const uniqueKey = `idemp-${Date.now()}-${Math.random()}`;
    const payload = {
      idempotencyKey: uniqueKey,
      items: [{ productId, quantity: 1, unitPrice: 1500 }],
      amountPaid: 1500,
    };

    // First request
    const res1 = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res1.status).toBe(201);
    const saleId1 = res1.body.sale.id;

    // Duplicate request with exact same idempotency key
    const res2 = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.idempotentReplay).toBe(true);
    expect(res2.body.sale.id).toBe(saleId1);
  });
});
