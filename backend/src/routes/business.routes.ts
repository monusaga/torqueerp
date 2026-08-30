import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant, requireRole } from '../middleware/auth.js';

const router = Router();

const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pin: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  currency: z.string().default('INR'),
  invoicePrefix: z.string().default('INV'),
  defaultTaxRate: z.number().default(18.0),
  allowNegativeStock: z.boolean().default(false),
});

const updateBusinessSchema = createBusinessSchema.partial();

// GET /api/v1/businesses - List businesses user belongs to
router.get('/', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: req.user!.id,
        isActive: true,
      },
      include: {
        business: true,
      },
    });

    res.json({
      businesses: memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        slug: m.business.slug,
        role: m.role,
        currency: m.business.currency,
        phone: m.business.phone,
        gstin: m.business.gstin,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/businesses - Create additional business
router.post('/', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBusinessSchema.parse(req.body);
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const business = await prisma.$transaction(async (tx) => {
      const b = await tx.business.create({
        data: {
          ...data,
          slug,
        },
      });

      await tx.businessMember.create({
        data: {
          businessId: b.id,
          userId: req.user!.id,
          role: 'OWNER',
          permissions: JSON.stringify(['*']),
        },
      });

      return b;
    });

    res.status(201).json({ business });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/businesses/current - Get active business details
router.get('/current', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.business!.id },
    });

    if (!business) {
      throw new AppError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
    }

    res.json({ business });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/businesses/current - Update active business settings
router.put('/current', authenticateJwt, requireTenant, requireRole(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateBusinessSchema.parse(req.body);

    const updated = await prisma.business.update({
      where: { id: req.business!.id },
      data,
    });

    res.json({ business: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/businesses/current - Permanently delete active business & all its data
router.delete('/current', authenticateJwt, requireTenant, requireRole(['OWNER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bizId = req.business!.id;

    await prisma.$transaction(async (tx) => {
      // 1. Delete Return Items & Returns
      await tx.returnItem.deleteMany({ where: { return: { businessId: bizId } } });
      await tx.return.deleteMany({ where: { businessId: bizId } });

      // 2. Delete Payments
      await tx.payment.deleteMany({ where: { businessId: bizId } });

      // 3. Delete Sale Items, Sales & Invoices
      await tx.saleItem.deleteMany({ where: { sale: { businessId: bizId } } });
      await tx.sale.deleteMany({ where: { businessId: bizId } });
      await tx.invoice.deleteMany({ where: { businessId: bizId } });

      // 4. Delete Purchase Items & Purchases
      await tx.purchaseItem.deleteMany({ where: { purchase: { businessId: bizId } } });
      await tx.purchase.deleteMany({ where: { businessId: bizId } });

      // 5. Delete Stock Movements
      await tx.stockMovement.deleteMany({ where: { businessId: bizId } });

      // 6. Delete Product Price History & Products
      await tx.productPriceHistory.deleteMany({ where: { product: { businessId: bizId } } });
      await tx.product.deleteMany({ where: { businessId: bizId } });
      await tx.productCategory.deleteMany({ where: { businessId: bizId } });
      await tx.productBrand.deleteMany({ where: { businessId: bizId } });

      // 7. Delete Customers & Suppliers
      await tx.customer.deleteMany({ where: { businessId: bizId } });
      await tx.supplier.deleteMany({ where: { businessId: bizId } });

      // 8. Delete Notifications, Audit Logs, Settings & Members
      await tx.notification.deleteMany({ where: { businessId: bizId } });
      await tx.auditLog.deleteMany({ where: { businessId: bizId } });
      await tx.tenantSetting.deleteMany({ where: { businessId: bizId } });
      await tx.subscription.deleteMany({ where: { businessId: bizId } });
      await tx.businessMember.deleteMany({ where: { businessId: bizId } });

      // 9. Delete Business
      await tx.business.delete({ where: { id: bizId } });
    },
    // A shop with real history needs more than Prisma's 5s interactive default.
    { timeout: 30_000, maxWait: 10_000 });

    res.json({ success: true, message: 'Business and all associated data permanently deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
