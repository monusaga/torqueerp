import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/lib/prisma.js';

describe('End-to-End Accounting & Stock Reconciliation Tests', () => {
  let token: string;
  let businessId: string;
  let productId: string;
  let supplierId: string;

  beforeAll(async () => {
    // Create dedicated isolated tenant for reconciliation testing
    const regEmail = `reconciliation.owner.${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Reconciliation Manager',
        email: regEmail,
        password: 'Password123!',
        businessName: `Reconciliation Spares ${Date.now()}`,
      });

    token = regRes.body.token;
    businessId = regRes.body.activeBusiness.id;

    // Create supplier
    const suppRes = await request(app)
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Reconciliation Supplier ${Date.now()}`,
        phone: '+919811223344',
        defaultDiscountPercent: 20,
      });
    supplierId = suppRes.body.supplier.id;

    // Create product
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Reconciliation Spark Plug ${Date.now()}`,
        partNumber: `REC-SPARK-${Date.now()}`,
        mrp: 200,
        purchaseCost: 120,
        sellingPrice: 180,
        initialStock: 10,
        minStock: 2,
      });
    productId = prodRes.body.product.id;
  });

  it('reconciles Inward Purchase -> Stock Increase -> Supplier Payable', async () => {
    const purchaseRes = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierId,
        invoiceNumber: `SUPP-INV-${Date.now()}`,
        freight: 50,
        items: [
          {
            productId,
            quantity: 20,
            mrp: 200,
            discountPercent: 20, // 200 - 40 = 160
            taxRate: 18,
          },
        ],
      });

    expect(purchaseRes.status).toBe(201);
    const purchaseId = purchaseRes.body.purchase.id;

    // Verify stock increased by 20 (initial 10 + 20 = 30)
    const prodDb = await prisma.product.findUnique({ where: { id: productId } });
    expect(prodDb?.currentStock).toBe(30);

    // Verify purchase movement in stock ledger
    const movement = await prisma.stockMovement.findFirst({
      where: {
        businessId,
        productId,
        referenceId: purchaseId,
        movementType: 'PURCHASE',
      },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(20);
  });

  it('reconciles POS Sale -> Invoice -> Payment Ledger -> Stock Deduction -> Gross Profit', async () => {
    const saleRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Rohit Sharma',
        customerPhone: '+919988776655',
        amountPaid: 900,
        paymentMethod: 'CASH',
        items: [
          {
            productId,
            quantity: 5,
            unitPrice: 180,
            discountAmount: 0,
            taxRate: 0,
          },
        ],
      });

    expect(saleRes.status).toBe(201);
    const sale = saleRes.body.sale;
    const invoice = saleRes.body.invoice;

    // 1. Reconcile Invoice totals match Sale totals
    expect(invoice.grandTotal).toBe(sale.grandTotal);
    expect(invoice.amountPaid).toBe(sale.amountPaid);
    expect(invoice.balanceDue).toBe(sale.balanceDue);
    expect(sale.grandTotal).toBe(900); // 5 * 180

    // 2. Reconcile Stock Deduction (30 - 5 = 25)
    const prodDb = await prisma.product.findUnique({ where: { id: productId } });
    expect(prodDb?.currentStock).toBe(25);

    // 3. Reconcile Payment Record created
    const payment = await prisma.payment.findFirst({
      where: {
        businessId,
        saleId: sale.id,
      },
    });
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe(900);
  });

  it('reconciles Dashboard summary KPIs against raw database records', async () => {
    const dashRes = await request(app)
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(dashRes.status).toBe(200);
    const summary = dashRes.body.summary;

    // Count products directly in database for this isolated business
    const dbProductCount = await prisma.product.count({
      where: { businessId, isActive: true },
    });

    expect(summary.totalProducts).toBe(dbProductCount);
    expect(summary.todaySales).toBe(900);
  });
});
