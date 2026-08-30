import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { StockLedgerService } from '../services/stockLedger.js';
import { LocalOCRService, normalizeCode } from '../services/ocrService.js';

const ocrService = new LocalOCRService();

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  mrp: z.number().min(0, 'MRP must be positive'),
  purchaseCost: z.number().min(0, 'Purchase cost must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  taxRate: z.number().default(18.0),
  minStock: z.number().default(5),
  maxStock: z.number().default(100),
  initialStock: z.number().default(0),
  supplierId: z.string().optional(),
  imageUrl: z.string().optional(),
  vehicleCompatibility: z.string().optional(),
  notes: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

// GET /api/v1/products - List products with search, pagination & filters
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, brand, lowStock, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {
      businessId: req.business!.id,
      isActive: true,
    };

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { partNumber: { contains: q } },
        { barcode: { contains: q } },
        { sku: { contains: q } },
        { vehicleCompatibility: { contains: q } },
      ];
    }

    if (category) where.category = String(category);
    if (brand) where.brand = String(brand);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Apply low stock filter if requested
    let result = products;
    if (lowStock === 'true') {
      result = products.filter((p) => p.currentStock <= p.minStock);
    }

    res.json({
      data: result,
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

// GET /api/v1/products/lookup/:code - Fast scanner lookup by barcode, part number or SKU
router.get('/lookup/:code', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.params.code).trim();

    const product = await prisma.product.findFirst({
      where: {
        businessId: req.business!.id,
        isActive: true,
        // qrCode included: QR payloads on OEM labels often differ from the
        // printed part number (e.g. Royal Enfield serial QR codes).
        OR: [
          { barcode: code },
          { partNumber: code },
          { sku: code },
          { qrCode: code },
        ],
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        error: { code: 'PRODUCT_NOT_FOUND', message: 'No product matched the scanned code.' },
      });
      return;
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

const identifyScanSchema = z.object({
  barcode: z.string().optional(),
  ocrText: z.string().optional(),
  partNumber: z.string().optional(),
  partName: z.string().optional(),
});

// POST /api/v1/products/identify-scan - Structured scanner identification.
//
// Priority: exact barcode/QR match -> exact/normalized part-number match from
// OCR text -> NEW_PRODUCT suggestion (prefill) -> NOT_IDENTIFIED.
// Always HTTP 200 with a status field; an unknown part is a normal scanner
// outcome, not a 404 dead-end. Matching is deterministic (canonical-code
// equality), never fuzzy — an ambiguous result returns candidates instead of
// silently guessing a spare part.
router.post('/identify-scan', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = identifyScanSchema.parse(req.body);
    const businessId = req.business!.id;

    // STEP 1: exact scanned-code match (barcode / partNumber / SKU / QR value).
    if (data.barcode && data.barcode.trim()) {
      const code = data.barcode.trim();
      const direct = await prisma.product.findFirst({
        where: {
          businessId,
          isActive: true,
          OR: [
            { barcode: code },
            { partNumber: code },
            { sku: code },
            { qrCode: code },
          ],
        },
      });
      if (direct) {
        res.json({ status: 'MATCHED_PRODUCT', matchedBy: 'barcode', product: direct });
        return;
      }
    }

    // STEP 2: OCR text -> extracted fields -> part-number matching.
    const extracted = data.ocrText && data.ocrText.trim()
      ? ocrService.parseExtractedText(data.ocrText)
      : null;

    const candidateCodes = [
      data.partNumber,
      extracted?.partNumber.value,
      extracted?.barcode.value,
    ]
      .filter((c): c is string => !!c && normalizeCode(c).length >= 3)
      .map((c) => c.trim());

    if (candidateCodes.length > 0) {
      // Exact match first.
      const exact = await prisma.product.findFirst({
        where: {
          businessId,
          isActive: true,
          OR: candidateCodes.flatMap((c) => [
            { partNumber: c },
            { barcode: c },
            { sku: c },
            { qrCode: c },
          ]),
        },
      });
      if (exact) {
        res.json({ status: 'MATCHED_PRODUCT', matchedBy: 'partNumber', product: exact, extracted });
        return;
      }

      // Normalized (canonical) comparison across this tenant's catalog:
      // "580387/F" == "580387 / F" == "580387-F".
      const normalizedTargets = new Set(candidateCodes.map(normalizeCode));
      const catalog = await prisma.product.findMany({
        where: { businessId, isActive: true },
        select: { id: true, partNumber: true, sku: true, barcode: true, qrCode: true },
      });
      const matchIds = catalog
        .filter((p) =>
          [p.partNumber, p.sku, p.barcode, p.qrCode].some(
            (f) => f && normalizedTargets.has(normalizeCode(f))
          )
        )
        .map((p) => p.id);

      if (matchIds.length === 1) {
        const product = await prisma.product.findUnique({ where: { id: matchIds[0] } });
        res.json({ status: 'MATCHED_PRODUCT', matchedBy: 'partNumber-normalized', product, extracted });
        return;
      }
      if (matchIds.length > 1) {
        const candidates = await prisma.product.findMany({ where: { id: { in: matchIds } } });
        res.json({ status: 'AMBIGUOUS_MATCH', candidates, extracted });
        return;
      }
    }

    // STEP 3: nothing matched — enough extracted data to prefill a new product?
    const hasPartNo = !!(data.partNumber || extracted?.partNumber.value);
    const hasNameAndPrice = !!((data.partName || extracted?.partName.value) && extracted?.mrp.value);
    if (hasPartNo || hasNameAndPrice) {
      const mrp = extracted?.mrp.value ?? null;
      res.json({
        status: 'NEW_PRODUCT',
        extracted,
        suggested: {
          partNumber: data.partNumber || extracted?.partNumber.value || null,
          name: data.partName || extracted?.partName.value || null,
          mrp,
          sellingPrice: mrp,
          brand: extracted?.manufacturer.value || null,
          barcode: data.barcode?.trim() || extracted?.barcode.value || null,
        },
      });
      return;
    }

    res.json({ status: 'NOT_IDENTIFIED', extracted });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/products - Create product with duplicate check
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);
    const { initialStock, ...productData } = data;

    // Check for duplicate part number in this business
    const existing = await prisma.product.findFirst({
      where: {
        businessId: req.business!.id,
        partNumber: productData.partNumber.trim(),
      },
    });

    if (existing && existing.isActive) {
      throw new AppError(
        `A product with Part Number "${productData.partNumber}" already exists in this business.`,
        409,
        'DUPLICATE_PRODUCT'
      );
    }

    // An archived product still holds its part number, because the unique key
    // covers the whole business. Re-adding that part — by scanning it again, say
    // — brings the same row back with the new details rather than failing on a
    // duplicate the shopkeeper cannot see in the catalog.
    if (existing) {
      const revived = await prisma.$transaction(async (tx) => {
        const p = await tx.product.update({
          where: { id: existing.id },
          data: { ...productData, isActive: true },
        });

        if (initialStock && initialStock > 0) {
          await StockLedgerService.recordMovement(
            {
              businessId: req.business!.id,
              productId: p.id,
              movementType: 'OPENING_STOCK',
              quantity: initialStock,
              unitCost: p.purchaseCost,
              userId: req.user!.id,
              notes: 'Opening stock recorded when the archived product was restored',
            },
            tx
          );
        }

        return p;
      });

      const refreshedRevived = await prisma.product.findUnique({ where: { id: revived.id } });
      res.status(201).json({ product: refreshedRevived, restored: true });
      return;
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          ...productData,
          businessId: req.business!.id,
          currentStock: 0,
        },
      });

      // If initial stock provided, record Opening Stock movement
      if (initialStock && initialStock > 0) {
        await StockLedgerService.recordMovement(
          {
            businessId: req.business!.id,
            productId: p.id,
            movementType: 'OPENING_STOCK',
            quantity: initialStock,
            unitCost: p.purchaseCost,
            userId: req.user!.id,
            notes: 'Initial opening stock upon product creation',
          },
          tx
        );
      }

      return p;
    });

    const refreshed = await prisma.product.findUnique({
      where: { id: product.id },
    });

    res.status(201).json({ product: refreshed });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/products/:id - Remove a product from the catalog.
//
// Every relation pointing at Product cascades, so deleting a row that has been
// sold or purchased would take its invoice lines and stock ledger entries with
// it and silently rewrite past invoices and profit figures. A product with that
// history is therefore archived instead: it disappears from the catalog, search
// and scanning, while every historical record stays intact. Only a product that
// was never transacted — the mis-scan a shopkeeper wants gone — is removed for
// real, since its sole trace is its own opening-stock entry.
router.delete('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessId = req.business!.id;
    const id = String(req.params.id);

    const product = await prisma.product.findFirst({ where: { id, businessId } });
    if (!product) {
      throw new AppError('Product not found in this business.', 404, 'PRODUCT_NOT_FOUND');
    }

    const [saleItems, purchaseItems, returnItems] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.purchaseItem.count({ where: { productId: id } }),
      prisma.returnItem.count({ where: { productId: id } }),
    ]);
    const transactionCount = saleItems + purchaseItems + returnItems;

    if (transactionCount > 0) {
      if (!product.isActive) {
        res.json({
          success: true,
          action: 'ALREADY_ARCHIVED',
          message: `"${product.name}" is already archived.`,
        });
        return;
      }

      const archived = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        action: 'ARCHIVED',
        message: `"${product.name}" has been archived. It no longer appears in the catalog, and its ${transactionCount} past record${transactionCount === 1 ? '' : 's'} stay unchanged.`,
        product: archived,
      });
      return;
    }

    await prisma.product.delete({ where: { id } });

    res.json({
      success: true,
      action: 'DELETED',
      message: `"${product.name}" has been deleted.`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/products/:id - Product details with stock history
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: String(req.params.id),
        businessId: req.business!.id,
      },
      include: {
        supplier: true,
        priceHistories: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found in this business.', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/products/:id - Update product & record price history
router.put('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProductSchema.parse(req.body);

    const existing = await prisma.product.findFirst({
      where: {
        id: String(req.params.id),
        businessId: req.business!.id,
      },
    });

    if (!existing) {
      throw new AppError('Product not found in this business.', 404, 'PRODUCT_NOT_FOUND');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Check if price changed, record price history
      if (
        (data.mrp !== undefined && data.mrp !== existing.mrp) ||
        (data.purchaseCost !== undefined && data.purchaseCost !== existing.purchaseCost) ||
        (data.sellingPrice !== undefined && data.sellingPrice !== existing.sellingPrice)
      ) {
        await tx.productPriceHistory.create({
          data: {
            businessId: req.business!.id,
            productId: existing.id,
            oldMrp: existing.mrp,
            newMrp: data.mrp ?? existing.mrp,
            oldCost: existing.purchaseCost,
            newCost: data.purchaseCost ?? existing.purchaseCost,
            oldSellingPrice: existing.sellingPrice,
            newSellingPrice: data.sellingPrice ?? existing.sellingPrice,
            changedByUserId: req.user!.id,
            reason: 'Manual price adjustment',
          },
        });
      }

      return await tx.product.update({
        where: { id: existing.id },
        data,
      });
    });

    res.json({ product: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
