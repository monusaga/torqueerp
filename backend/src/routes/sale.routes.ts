import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { StockLedgerService } from '../services/stockLedger.js';
import { calculateGrossProfit, calculatePaymentBalance, roundCurrency, toDecimal } from '../lib/decimal.js';

const router = Router();

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discountAmount: z.number().default(0),
  taxRate: z.number().default(0),
});

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerVehicle: z.string().optional(),
  amountPaid: z.number().min(0).default(0),
  paymentMethod: z.string().default('CASH'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item required in cart'),
});

// GET /api/v1/sales - List sales
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', search } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = { businessId: req.business!.id };
    if (search) {
      where.invoiceNumber = { contains: String(search).trim() };
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, vehicleNumber: true } },
          items: true,
          invoice: true,
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      data: sales,
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

// POST /api/v1/sales - Execute POS counter sale checkout
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSaleSchema.parse(req.body);

    // Idempotency check if key provided
    if (data.idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: { sale: { include: { items: true, invoice: true } } },
      });
      if (existingPayment && existingPayment.sale) {
        res.json({ sale: existingPayment.sale, idempotentReplay: true });
        return;
      }
    }

    // Step 1: Pre-fetch products to validate stock & lock historical unitCost
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: req.business!.id,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of data.items) {
      const p = productMap.get(item.productId);
      if (!p) {
        throw new AppError(`Product with ID "${item.productId}" not found.`, 404, 'PRODUCT_NOT_FOUND');
      }
      if (!req.business!.allowNegativeStock && p.currentStock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${p.name}". Available: ${p.currentStock}, Requested: ${item.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
    }

    // Step 2: Calculate deterministic line items, COGS, and profit
    let calculatedSubtotal = toDecimal(0);
    let calculatedDiscountTotal = toDecimal(0);
    let calculatedTaxTotal = toDecimal(0);
    let calculatedTotalCOGS = toDecimal(0);
    let calculatedTotalGrossProfit = toDecimal(0);

    const processedSaleItems = data.items.map((item) => {
      const prod = productMap.get(item.productId)!;
      const unitCostAtSale = prod.purchaseCost; // Locked historical cost

      const dUnitPrice = toDecimal(item.unitPrice);
      const dQty = toDecimal(item.quantity);
      const dDiscount = toDecimal(item.discountAmount);
      const dTaxRate = toDecimal(item.taxRate);

      const netUnitPrice = dUnitPrice.minus(dDiscount);
      const lineSubtotal = netUnitPrice.times(dQty);
      const lineTax = lineSubtotal.times(dTaxRate).dividedBy(100);
      const lineTotal = lineSubtotal.plus(lineTax);

      const { cogs, grossProfit } = calculateGrossProfit(netUnitPrice.toNumber(), unitCostAtSale, item.quantity);

      calculatedSubtotal = calculatedSubtotal.plus(dUnitPrice.times(dQty));
      calculatedDiscountTotal = calculatedDiscountTotal.plus(dDiscount.times(dQty));
      calculatedTaxTotal = calculatedTaxTotal.plus(lineTax);
      calculatedTotalCOGS = calculatedTotalCOGS.plus(toDecimal(cogs));
      calculatedTotalGrossProfit = calculatedTotalGrossProfit.plus(toDecimal(grossProfit));

      return {
        productId: item.productId,
        partNumber: prod.partNumber,
        productName: prod.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCostAtSale,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate,
        taxAmount: roundCurrency(lineTax),
        totalAmount: roundCurrency(lineTotal),
        grossProfit,
      };
    });

    const grandTotal = roundCurrency(
      calculatedSubtotal.minus(calculatedDiscountTotal).plus(calculatedTaxTotal)
    );

    const grossMarginPercent = grandTotal > 0
      ? roundCurrency(calculatedTotalGrossProfit.dividedBy(toDecimal(grandTotal)).times(100))
      : 0;

    const { balanceDue, paymentStatus } = calculatePaymentBalance(grandTotal, data.amountPaid);

    // Step 3: Atomic database transaction for Sale, Invoice, Stock Ledger, & Payment
    const completedSale = await prisma.$transaction(async (tx) => {
      // Get next invoice number
      const biz = await tx.business.update({
        where: { id: req.business!.id },
        data: { nextInvoiceNumber: { increment: 1 } },
      });

      const invoiceNumber = `${biz.invoicePrefix || 'INV'}-${biz.nextInvoiceNumber}`;

      // Find or create customer if phone/name supplied without customerId
      let customerId = data.customerId;
      if (!customerId && (data.customerName || data.customerPhone)) {
        let cust = null;
        if (data.customerPhone) {
          cust = await tx.customer.findFirst({
            where: {
              businessId: req.business!.id,
              phone: data.customerPhone.trim(),
            },
          });
        }
        if (!cust) {
          cust = await tx.customer.create({
            data: {
              businessId: req.business!.id,
              name: data.customerName || 'Cash Customer',
              phone: data.customerPhone,
              vehicleNumber: data.customerVehicle,
            },
          });
        }
        customerId = cust.id;
      }

      const sale = await tx.sale.create({
        data: {
          businessId: req.business!.id,
          customerId,
          invoiceNumber,
          saleDate: new Date(),
          subtotal: roundCurrency(calculatedSubtotal),
          discountAmount: roundCurrency(calculatedDiscountTotal),
          taxAmount: roundCurrency(calculatedTaxTotal),
          grandTotal,
          totalCostCOGS: roundCurrency(calculatedTotalCOGS),
          grossProfit: roundCurrency(calculatedTotalGrossProfit),
          grossMarginPercent,
          amountPaid: data.amountPaid,
          balanceDue,
          paymentStatus,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          status: 'COMPLETED',
          items: {
            create: processedSaleItems,
          },
        },
      });

      // Create linked Invoice record
      const invoice = await tx.invoice.create({
        data: {
          businessId: req.business!.id,
          saleId: sale.id,
          customerId,
          invoiceNumber,
          invoiceDate: sale.saleDate,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          subtotal: sale.subtotal,
          discountAmount: sale.discountAmount,
          taxAmount: sale.taxAmount,
          grandTotal: sale.grandTotal,
          amountPaid: sale.amountPaid,
          balanceDue: sale.balanceDue,
          paymentStatus: sale.paymentStatus,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
        },
      });

      // Deduct stock via StockLedgerService
      for (const item of processedSaleItems) {
        await StockLedgerService.recordMovement(
          {
            businessId: req.business!.id,
            productId: item.productId,
            movementType: 'SALE',
            quantity: -item.quantity,
            unitCost: item.unitCostAtSale,
            referenceType: 'SALE',
            referenceId: sale.id,
            userId: req.user!.id,
            notes: `Sale Invoice: ${invoiceNumber}`,
          },
          tx
        );
      }

      // Record payment ledger if payment received
      if (data.amountPaid > 0) {
        await tx.payment.create({
          data: {
            businessId: req.business!.id,
            referenceType: 'SALE',
            referenceId: sale.id,
            saleId: sale.id,
            customerId,
            amount: data.amountPaid,
            method: data.paymentMethod,
            status: 'COMPLETED',
            idempotencyKey: data.idempotencyKey,
            notes: `Payment for Sale Invoice ${invoiceNumber}`,
            recordedByUserId: req.user!.id,
          },
        });
      }

      return { sale, invoice };
    });

    res.status(201).json({
      sale: completedSale.sale,
      invoice: completedSale.invoice,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/sales/:id
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: {
        id: String(req.params.id),
        businessId: req.business!.id,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true, partNumber: true, barcode: true } },
          },
        },
        invoice: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new AppError('Sale record not found in this business.', 404, 'SALE_NOT_FOUND');
    }

    res.json({ sale });
  } catch (error) {
    next(error);
  }
});

export default router;
