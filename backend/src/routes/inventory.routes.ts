import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { StockLedgerService } from '../services/stockLedger.js';
import { MovementType } from '@prisma/client';

const router = Router();

const adjustStockSchema = z.object({
  productId: z.string(),
  movementType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'RETURN_IN', 'RETURN_OUT']),
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

// GET /api/v1/inventory/movements - Stock movement audit ledger
router.get('/movements', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, movementType, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {
      businessId: req.business!.id,
    };

    if (productId) where.productId = String(productId);
    if (movementType) where.movementType = movementType as MovementType;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, partNumber: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      data: movements,
      meta: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/inventory/adjust - Manual stock adjustment
router.post('/adjust', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = adjustStockSchema.parse(req.body);

    const isInflow = ['ADJUSTMENT_IN', 'RETURN_IN'].includes(data.movementType);
    const deltaQuantity = isInflow ? data.quantity : -data.quantity;

    const result = await prisma.$transaction(async (tx) => {
      return await StockLedgerService.recordMovement(
        {
          businessId: req.business!.id,
          productId: data.productId,
          movementType: data.movementType as MovementType,
          quantity: deltaQuantity,
          userId: req.user!.id,
          referenceType: 'MANUAL_ADJUSTMENT',
          notes: data.notes || `Manual ${data.movementType} adjustment`,
        },
        tx
      );
    });

    res.json({
      success: true,
      movement: result.movement,
      beforeQuantity: result.beforeQuantity,
      afterQuantity: result.afterQuantity,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
