import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  contactPerson: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/suppliers
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        businessId: req.business!.id,
        isActive: true,
      },
      include: {
        _count: {
          select: { purchases: true, products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: suppliers });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/suppliers
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = supplierSchema.parse(req.body);

    const existing = await prisma.supplier.findFirst({
      where: {
        businessId: req.business!.id,
        name: data.name.trim(),
      },
    });

    if (existing) {
      throw new AppError('A supplier with this name already exists.', 409, 'DUPLICATE_SUPPLIER');
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        businessId: req.business!.id,
      },
    });

    res.status(201).json({ supplier });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/suppliers/:id - Supplier details with purchase history
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: String(req.params.id),
        businessId: req.business!.id,
      },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 20,
        },
        products: {
          take: 50,
        },
      },
    });

    if (!supplier) {
      throw new AppError('Supplier not found in this business.', 404, 'SUPPLIER_NOT_FOUND');
    }

    res.json({ supplier });
  } catch (error) {
    next(error);
  }
});

export default router;
