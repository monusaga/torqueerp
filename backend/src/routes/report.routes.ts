import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { roundCurrency, toDecimal } from '../lib/decimal.js';

const router = Router();

// GET /api/v1/reports/dashboard - Realtime business dashboard KPIs
router.get('/dashboard', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessId = req.business!.id;

    // Calculate today's date boundary in current business timezone
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      todaySales,
      todayPurchases,
      allProducts,
      recentSales,
      lowStockProducts,
      unpaidInvoices,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: {
          businessId,
          saleDate: { gte: startOfToday },
          status: 'COMPLETED',
        },
        select: { grandTotal: true, grossProfit: true },
      }),
      prisma.purchase.findMany({
        where: {
          businessId,
          purchaseDate: { gte: startOfToday },
          status: 'COMPLETED',
        },
        select: { grandTotal: true },
      }),
      prisma.product.findMany({
        where: { businessId, isActive: true },
        select: { id: true, currentStock: true, purchaseCost: true, sellingPrice: true, minStock: true },
      }),
      prisma.sale.findMany({
        where: { businessId, status: 'COMPLETED' },
        orderBy: { saleDate: 'desc' },
        take: 5,
        include: { customer: { select: { name: true } }, items: true },
      }),
      prisma.product.findMany({
        where: {
          businessId,
          isActive: true,
          currentStock: { lte: prisma.product.fields.minStock as any },
        },
        take: 10,
        orderBy: { currentStock: 'asc' },
      }),
      prisma.sale.findMany({
        where: {
          businessId,
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
        select: { balanceDue: true },
      }),
    ]);

    const todaySalesRevenue = roundCurrency(
      todaySales.reduce((sum, s) => sum + s.grandTotal, 0)
    );
    const todayGrossProfit = roundCurrency(
      todaySales.reduce((sum, s) => sum + s.grossProfit, 0)
    );
    const todayPurchasesTotal = roundCurrency(
      todayPurchases.reduce((sum, p) => sum + p.grandTotal, 0)
    );

    let totalStockValueCost = toDecimal(0);
    let totalStockValueRetail = toDecimal(0);
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of allProducts) {
      if (p.currentStock <= 0) {
        outOfStockCount++;
      } else if (p.currentStock <= p.minStock) {
        lowStockCount++;
      }

      totalStockValueCost = totalStockValueCost.plus(toDecimal(p.purchaseCost).times(p.currentStock));
      totalStockValueRetail = totalStockValueRetail.plus(toDecimal(p.sellingPrice).times(p.currentStock));
    }

    const totalReceivables = roundCurrency(
      unpaidInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)
    );

    res.json({
      summary: {
        todaySales: todaySalesRevenue,
        todayGrossProfit,
        todayPurchases: todayPurchasesTotal,
        totalProducts: allProducts.length,
        stockValueCost: roundCurrency(totalStockValueCost),
        stockValueRetail: roundCurrency(totalStockValueRetail),
        lowStockCount,
        outOfStockCount,
        totalReceivables,
      },
      recentSales,
      lowStockProducts,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/export - Export dataset as CSV
router.get('/export', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'products' } = req.query;
    const businessId = req.business!.id;

    if (type === 'products') {
      const products = await prisma.product.findMany({
        where: { businessId },
        orderBy: { name: 'asc' },
      });

      const sanitizeCsv = (val: string | null | undefined) => {
        if (!val) return '';
        let str = String(val).replace(/"/g, '""');
        if (['=', '+', '-', '@'].includes(str.charAt(0))) {
          str = `'${str}`;
        }
        return str;
      };

      const header = 'ID,Name,PartNumber,Brand,Category,MRP,PurchaseCost,SellingPrice,CurrentStock,MinStock\n';
      const rows = products.map((p) =>
        `"${sanitizeCsv(p.id)}","${sanitizeCsv(p.name)}","${sanitizeCsv(p.partNumber)}","${sanitizeCsv(p.brand)}","${sanitizeCsv(p.category)}",${p.mrp},${p.purchaseCost},${p.sellingPrice},${p.currentStock},${p.minStock}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
      res.send(header + rows);
      return;
    }

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        where: { businessId },
        include: { customer: true },
        orderBy: { saleDate: 'desc' },
      });

      const sanitizeCsv = (val: string | null | undefined) => {
        if (!val) return '';
        let str = String(val).replace(/"/g, '""');
        if (['=', '+', '-', '@'].includes(str.charAt(0))) {
          str = `'${str}`;
        }
        return str;
      };

      const header = 'InvoiceNumber,Date,Customer,Subtotal,Discount,Tax,GrandTotal,COGS,GrossProfit,PaymentStatus\n';
      const rows = sales.map((s) =>
        `"${sanitizeCsv(s.invoiceNumber)}","${s.saleDate.toISOString()}","${sanitizeCsv(s.customer?.name || 'Cash Customer')}",${s.subtotal},${s.discountAmount},${s.taxAmount},${s.grandTotal},${s.totalCostCOGS},${s.grossProfit},"${sanitizeCsv(s.paymentStatus)}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_export.csv"');
      res.send(header + rows);
      return;
    }

    res.status(400).json({ error: { code: 'INVALID_EXPORT_TYPE', message: 'Supported types: products, sales' } });
  } catch (error) {
    next(error);
  }
});

export default router;
