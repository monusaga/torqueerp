import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { StockLedgerService } from '../services/stockLedger.js';
import { calculateDiscount, calculateLandedCost, calculatePaymentBalance, roundCurrency, toDecimal } from '../lib/decimal.js';

const router = Router();

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive('Quantity must be positive'),
  mrp: z.number().min(0).optional(),
  unitMRP: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().default(0),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  supplierInvoiceNo: z.string().optional(),
  purchaseDate: z.string().optional(),
  freight: z.number().default(0),
  freightCharges: z.number().default(0),
  otherCharges: z.number().default(0),
  amountPaid: z.number().default(0),
  paymentMethod: z.string().default('CASH'),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

// GET /api/v1/purchases - List purchases
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: { businessId: req.business!.id },
        skip,
        take,
        orderBy: { purchaseDate: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, partNumber: true } },
            },
          },
        },
      }),
      prisma.purchase.count({ where: { businessId: req.business!.id } }),
    ]);

    res.json({
      data: purchases,
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

// POST /api/v1/purchases - Record purchase stock inflow
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPurchaseSchema.parse(req.body);
    const invoiceNum = (data.invoiceNumber || data.supplierInvoiceNo || `PUR-${Date.now()}`).trim();
    const freightAmount = data.freight || data.freightCharges || 0;

    const totalUnits = data.items.reduce((acc, item) => acc + item.quantity, 0);

    // Calculate itemized figures deterministically
    let calculatedSubtotal = toDecimal(0);
    let calculatedDiscountTotal = toDecimal(0);
    let calculatedTaxTotal = toDecimal(0);

    const processedItems = data.items.map((item) => {
      const itemMrp = item.mrp ?? item.unitMRP ?? 0;
      const { unitPrice, discountAmount } = calculateDiscount(itemMrp, item.discountPercent);
      const landedUnitCost = calculateLandedCost(
        unitPrice,
        item.quantity,
        freightAmount,
        data.otherCharges,
        totalUnits
      );

      const dUnitPrice = toDecimal(unitPrice);
      const dQty = toDecimal(item.quantity);
      const dTaxRate = toDecimal(item.taxRate);

      const lineSubtotal = dUnitPrice.times(dQty);
      const lineTax = lineSubtotal.times(dTaxRate).dividedBy(100);
      const lineTotal = lineSubtotal.plus(lineTax);

      calculatedSubtotal = calculatedSubtotal.plus(toDecimal(itemMrp).times(dQty));
      calculatedDiscountTotal = calculatedDiscountTotal.plus(toDecimal(discountAmount).times(dQty));
      calculatedTaxTotal = calculatedTaxTotal.plus(lineTax);

      return {
        productId: item.productId,
        quantity: item.quantity,
        mrp: itemMrp,
        discountPercent: item.discountPercent,
        discountAmount: roundCurrency(discountAmount),
        unitCost: unitPrice,
        taxRate: item.taxRate,
        taxAmount: roundCurrency(lineTax),
        landedCostUnit: landedUnitCost,
        totalAmount: roundCurrency(lineTotal),
      };
    });

    const netItemsSubtotal = processedItems.reduce((acc, i) => acc + i.totalAmount, 0);
    const grandTotal = roundCurrency(
      toDecimal(netItemsSubtotal).plus(freightAmount).plus(data.otherCharges)
    );

    const { balanceDue, paymentStatus } = calculatePaymentBalance(grandTotal, data.amountPaid);

    // Execute atomic purchase creation, stock ledger inflow and payment recording
    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          businessId: req.business!.id,
          supplierId: data.supplierId,
          invoiceNumber: invoiceNum,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          subtotal: roundCurrency(calculatedSubtotal),
          discountAmount: roundCurrency(calculatedDiscountTotal),
          taxAmount: roundCurrency(calculatedTaxTotal),
          freight: freightAmount,
          otherCharges: data.otherCharges,
          grandTotal,
          amountPaid: data.amountPaid,
          balanceDue,
          paymentStatus,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          items: {
            create: processedItems,
          },
        },
      });

      // Update product current stock and landed purchase costs
      for (const item of processedItems) {
        await StockLedgerService.recordMovement(
          {
            businessId: req.business!.id,
            productId: item.productId,
            movementType: 'PURCHASE',
            quantity: item.quantity,
            unitCost: item.landedCostUnit,
            referenceType: 'PURCHASE',
            referenceId: p.id,
            userId: req.user!.id,
            notes: `Purchase Invoice: ${invoiceNum}`,
          },
          tx
        );

        // Update product master purchase cost to latest landed cost
        await tx.product.update({
          where: { id: item.productId },
          data: { purchaseCost: item.landedCostUnit },
        });
      }

      // Record payment ledger entry if upfront payment made
      if (data.amountPaid > 0) {
        await tx.payment.create({
          data: {
            businessId: req.business!.id,
            referenceType: 'PURCHASE',
            referenceId: p.id,
            purchaseId: p.id,
            supplierId: data.supplierId,
            amount: data.amountPaid,
            method: data.paymentMethod,
            status: 'COMPLETED',
            notes: `Upfront payment for purchase ${invoiceNum}`,
            recordedByUserId: req.user!.id,
          },
        });
      }

      return p;
    });

    res.status(201).json({ purchase });
  } catch (error) {
    next(error);
  }
});

export default router;
