import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { PdfService } from '../services/pdfService.js';

const router = Router();

// GET /api/v1/invoices - List invoices
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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, vehicleNumber: true } },
          sale: {
            include: {
              items: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      data: invoices,
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

// GET /api/v1/invoices/:id - Invoice details
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: String(req.params.id),
        businessId: req.business!.id,
      },
      include: {
        customer: true,
        sale: {
          include: {
            items: true,
          },
        },
        business: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found in this business.', 404, 'INVOICE_NOT_FOUND');
    }

    res.json({ invoice });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/invoices/:id/pdf - Stream PDF invoice (A4, A5, THERMAL)
router.get('/:id/pdf', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = (req.query.format as 'A4' | 'A5' | 'THERMAL') || 'A4';

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: String(req.params.id),
        businessId: req.business!.id,
      },
      include: {
        customer: true,
        sale: {
          include: {
            items: true,
          },
        },
        business: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found in this business.', 404, 'INVOICE_NOT_FOUND');
    }

    const pdfBuffer = await PdfService.generateInvoicePdf(
      {
        business: {
          name: invoice.business.name,
          phone: invoice.business.phone,
          email: invoice.business.email,
          address: invoice.business.address,
          city: invoice.business.city,
          state: invoice.business.state,
          pin: invoice.business.pin,
          gstin: invoice.business.gstin,
        },
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          taxAmount: invoice.taxAmount,
          grandTotal: invoice.grandTotal,
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,
          paymentStatus: invoice.paymentStatus,
          paymentMethod: invoice.paymentMethod,
          notes: invoice.notes,
        },
        customer: invoice.customer,
        items: invoice.sale.items.map((item) => ({
          partNumber: item.partNumber,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          totalAmount: item.totalAmount,
        })),
      },
      format
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
