import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { calculatePaymentBalance, roundCurrency, toDecimal } from '../lib/decimal.js';

const router = Router();

const recordPaymentSchema = z.object({
  referenceType: z.enum(['SALE', 'PURCHASE', 'CUSTOMER_BALANCE', 'SUPPLIER_BALANCE']),
  referenceId: z.string(),
  amount: z.number().positive('Payment amount must be greater than zero'),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CREDIT', 'OTHER']).default('CASH'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// GET /api/v1/payments - Payment ledger
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', referenceType } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = { businessId: req.business!.id };
    if (referenceType) where.referenceType = String(referenceType);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
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

// POST /api/v1/payments - Record payment transaction with idempotency and balance update
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recordPaymentSchema.parse(req.body);

    // Idempotency check
    if (data.idempotencyKey) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        res.json({ payment: existing, idempotentReplay: true });
        return;
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      let customerId: string | undefined;
      let supplierId: string | undefined;
      let saleId: string | undefined;
      let purchaseId: string | undefined;

      if (data.referenceType === 'SALE') {
        const sale = await tx.sale.findFirst({
          where: { id: data.referenceId, businessId: req.business!.id },
          include: { invoice: true },
        });

        if (!sale) {
          throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');
        }

        saleId = sale.id;
        customerId = sale.customerId || undefined;

        const newAmountPaid = roundCurrency(toDecimal(sale.amountPaid).plus(data.amount));
        const { balanceDue, paymentStatus } = calculatePaymentBalance(sale.grandTotal, newAmountPaid);

        await tx.sale.update({
          where: { id: sale.id },
          data: { amountPaid: newAmountPaid, balanceDue, paymentStatus },
        });

        if (sale.invoice) {
          await tx.invoice.update({
            where: { id: sale.invoice.id },
            data: { amountPaid: newAmountPaid, balanceDue, paymentStatus },
          });
        }
      } else if (data.referenceType === 'PURCHASE') {
        const purchase = await tx.purchase.findFirst({
          where: { id: data.referenceId, businessId: req.business!.id },
        });

        if (!purchase) {
          throw new AppError('Purchase not found.', 404, 'PURCHASE_NOT_FOUND');
        }

        purchaseId = purchase.id;
        supplierId = purchase.supplierId || undefined;

        const newAmountPaid = roundCurrency(toDecimal(purchase.amountPaid).plus(data.amount));
        const { balanceDue, paymentStatus } = calculatePaymentBalance(purchase.grandTotal, newAmountPaid);

        await tx.purchase.update({
          where: { id: purchase.id },
          data: { amountPaid: newAmountPaid, balanceDue, paymentStatus },
        });
      }

      return await tx.payment.create({
        data: {
          businessId: req.business!.id,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          saleId,
          purchaseId,
          customerId,
          supplierId,
          amount: data.amount,
          method: data.method,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          idempotencyKey: data.idempotencyKey,
          status: 'COMPLETED',
          recordedByUserId: req.user!.id,
        },
      });
    });

    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
});

export default router;
