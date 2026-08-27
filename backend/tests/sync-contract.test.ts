import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Web <-> Android Full Two-Way Synchronization & APK Distribution Tests', () => {
  let token: string;
  let productId: string;
  let partNumber: string;
  let barcode: string;

  beforeAll(async () => {
    // 1. Authenticate Owner
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.a@example.com', password: 'password123' });
    token = res.body.token;

    partNumber = `SYNC-VALVE-${Date.now()}`;
    barcode = `890123${Date.now().toString().slice(-6)}`;

    // 2. Create product via Web Catalog
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Royal Enfield Titanium Intake Valve',
        partNumber,
        barcode,
        brand: 'Royal Enfield Genuine',
        mrp: 850,
        purchaseCost: 500,
        sellingPrice: 750,
        initialStock: 15,
        minStock: 3,
      });

    productId = prodRes.body.product.id;
  });

  it('verifies Android barcode scanner lookup matches product created on Web', async () => {
    // Android calls GET /products/lookup/:code with scanned barcode
    const lookupRes = await request(app)
      .get(`/api/v1/products/lookup/${barcode}`)
      .set('Authorization', `Bearer ${token}`);

    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.product).toBeDefined();
    expect(lookupRes.body.product.id).toBe(productId);
    expect(lookupRes.body.product.name).toBe('Royal Enfield Titanium Intake Valve');
    expect(lookupRes.body.product.currentStock).toBe(15);
  });

  it('processes POS Sale from Android app -> synchronizes instantly to Web Invoices & Reports', async () => {
    // Android POS checkout request payload
    const mobileSalePayload = {
      customerName: 'Vikram Singh (Rider)',
      customerPhone: '+919911223344',
      customerVehicle: 'DL 01 AB 9999 (Interceptor 650)',
      amountPaid: 1500,
      paymentMethod: 'UPI',
      items: [
        {
          productId,
          quantity: 2,
          unitPrice: 750,
          discountAmount: 0,
          taxRate: 0,
        },
      ],
    };

    const saleRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(mobileSalePayload);

    expect(saleRes.status).toBe(201);
    const invoiceNumber = saleRes.body.invoice.invoiceNumber;

    // 1. Verify Web ERP Invoices list displays the sale created on mobile
    const webInvoicesRes = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(webInvoicesRes.status).toBe(200);
    const invoiceInWeb = webInvoicesRes.body.data.find((inv: any) => inv.invoiceNumber === invoiceNumber);
    expect(invoiceInWeb).toBeDefined();
    expect(invoiceInWeb.grandTotal).toBe(1500);
    expect(invoiceInWeb.customerName).toBe('Vikram Singh (Rider)');

    // 2. Verify stock deduction synchronized (15 - 2 = 13)
    const prodRes = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(prodRes.body.product.currentStock).toBe(13);
  });

  it('records Inward Purchase on Web -> updates Android Product stock instantly', async () => {
    // Web Inward Stock Purchase
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: `SUPP-RESTOCK-${Date.now()}`,
        items: [
          {
            productId,
            quantity: 10,
            mrp: 850,
            discountPercent: 10,
          },
        ],
      });

    // Android app re-fetches product by partNumber
    const lookupRes = await request(app)
      .get(`/api/v1/products/lookup/${partNumber}`)
      .set('Authorization', `Bearer ${token}`);

    expect(lookupRes.status).toBe(200);
    // Stock should now be 13 + 10 = 23
    expect(lookupRes.body.product.currentStock).toBe(23);
  });

  it('verifies real compiled APK download stream integrity and MIME headers', async () => {
    const res = await request(app)
      .get('/api/v1/downloads/android')
      .buffer(true)
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk) => data.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/vnd.android.package-archive');
    // Version-agnostic: the filename must match the advertised release version.
    const info = await request(app).get('/api/v1/downloads/android/info');
    expect(res.headers['content-disposition']).toContain(info.body.app.fileName);
    expect(res.headers['x-app-version']).toBe(info.body.app.version);
    expect(res.headers['x-package-id']).toBe('com.torqueerp.app');

    // Verify standard ZIP/APK binary magic bytes 'PK\x03\x04'
    const binaryData: Buffer = res.body;
    expect(binaryData[0]).toBe(0x50); // 'P'
    expect(binaryData[1]).toBe(0x4b); // 'K'
    expect(binaryData[2]).toBe(0x03);
    expect(binaryData[3]).toBe(0x04);
  });
});
