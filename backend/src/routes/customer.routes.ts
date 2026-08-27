import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  vehicleNumber: z.string().optional(),
  vehicleModel: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/customers
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const where: any = { businessId: req.business!.id };

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { vehicleNumber: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { sales: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    res.json({ data: customers });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/customers
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        ...data,
        businessId: req.business!.id,
      },
    });

    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/customers/:id
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business!.id,
      },
      include: {
        sales: {
          orderBy: { saleDate: 'desc' },
          take: 20,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found in this business.', 404, 'CUSTOMER_NOT_FOUND');
    }

    res.json({ customer });
  } catch (error) {
    next(error);
  }
});

export default router;
