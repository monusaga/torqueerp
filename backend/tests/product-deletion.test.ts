import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/lib/prisma.js';

/**
 * Every relation pointing at Product cascades, so a careless hard delete would
 * take invoice lines and stock ledger entries with it. These tests pin the rule
 * that keeps that from happening: transacted products archive, untouched ones go.
 */
describe('DELETE /products/:id — archive vs remove', () => {
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.a@example.com', password: 'password123' });
    token = res.body.token;
  });

  const createProduct = async (suffix: string, stock = 10) => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        name: `Deletable Part ${suffix}`,
        partNumber: `DEL-${suffix}`,
        mrp: 300,
        purchaseCost: 150,
        sellingPrice: 280,
        initialStock: stock,
        minStock: 1,
      });
    expect(res.status).toBe(201);
    return res.body.product;
  };

  it('removes a product that was never transacted', async () => {
    const product = await createProduct(`fresh-${Date.now()}`);

    const del = await request(app).delete(`/api/v1/products/${product.id}`).set(auth());

    expect(del.status).toBe(200);
    expect(del.body.action).toBe('DELETED');
    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
  });

  it('archives a sold product instead of deleting it, leaving the invoice intact', async () => {
    const product = await createProduct(`sold-${Date.now()}`);

    const sale = await request(app)
      .post('/api/v1/sales')
      .set(auth())
      .send({
        customerName: 'Archive Test Buyer',
        items: [{ productId: product.id, quantity: 2, unitPrice: 280 }],
        amountPaid: 560,
      });
    expect(sale.status).toBe(201);
    const invoiceId = sale.body.invoice.id;

    const del = await request(app).delete(`/api/v1/products/${product.id}`).set(auth());

    expect(del.status).toBe(200);
    expect(del.body.action).toBe('ARCHIVED');

    // The row survives, flagged inactive — and so does everything hanging off it.
    const inDb = await prisma.product.findUnique({ where: { id: product.id } });
    expect(inDb).not.toBeNull();
    expect(inDb!.isActive).toBe(false);

    const [saleItems, invoice, movements] = await Promise.all([
      prisma.saleItem.count({ where: { productId: product.id } }),
      prisma.invoice.findUnique({ where: { id: invoiceId } }),
      prisma.stockMovement.count({ where: { productId: product.id } }),
    ]);
    expect(saleItems).toBeGreaterThan(0);
    expect(invoice).not.toBeNull();
    expect(movements).toBeGreaterThan(0);
  });

  it('hides an archived product from the catalog listing', async () => {
    const product = await createProduct(`hidden-${Date.now()}`);
    await request(app)
      .post('/api/v1/sales')
      .set(auth())
      .send({
        customerName: 'Hidden Test Buyer',
        items: [{ productId: product.id, quantity: 1, unitPrice: 280 }],
        amountPaid: 280,
      });
    await request(app).delete(`/api/v1/products/${product.id}`).set(auth());

    const list = await request(app)
      .get(`/api/v1/products?search=${product.partNumber}`)
      .set(auth());

    expect(list.status).toBe(200);
    expect(list.body.data.some((p: any) => p.id === product.id)).toBe(false);
  });

  it('restores the archived product when the same part number is added again', async () => {
    const suffix = `revive-${Date.now()}`;
    const product = await createProduct(suffix);
    await request(app)
      .post('/api/v1/sales')
      .set(auth())
      .send({
        customerName: 'Revive Test Buyer',
        items: [{ productId: product.id, quantity: 1, unitPrice: 280 }],
        amountPaid: 280,
      });
    await request(app).delete(`/api/v1/products/${product.id}`).set(auth());

    // Scanning the part again must not fail on a duplicate the shopkeeper
    // cannot see; it brings the same row back with the new details.
    const again = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        name: 'Deletable Part Renamed',
        partNumber: `DEL-${suffix}`,
        mrp: 400,
        purchaseCost: 200,
        sellingPrice: 380,
        initialStock: 5,
        minStock: 1,
      });

    expect(again.status).toBe(201);
    expect(again.body.restored).toBe(true);
    expect(again.body.product.id).toBe(product.id);
    expect(again.body.product.isActive).toBe(true);
    expect(again.body.product.name).toBe('Deletable Part Renamed');
  });

  it('refuses to delete a product belonging to another business', async () => {
    const other = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner.b@example.com', password: 'password123' });

    const product = await createProduct(`cross-${Date.now()}`);

    const del = await request(app)
      .delete(`/api/v1/products/${product.id}`)
      .set({ Authorization: `Bearer ${other.body.token}` });

    expect(del.status).toBe(404);
    expect(await prisma.product.findUnique({ where: { id: product.id } })).not.toBeNull();
  });

  it('returns 404 for a product id that does not exist', async () => {
    const del = await request(app)
      .delete('/api/v1/products/00000000-0000-0000-0000-000000000000')
      .set(auth());
    expect(del.status).toBe(404);
  });
});
