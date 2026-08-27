import { prisma } from '../lib/prisma.js';
import { MovementType, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export interface StockMovementParams {
  businessId: string;
  productId: string;
  movementType: MovementType;
  quantity: number; // Positive for additions, negative for reductions
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  userId?: string;
  notes?: string;
  locationId?: string;
}

export class StockLedgerService {
  /**
   * Records an immutable stock movement and updates product currentStock atomically.
   */
  static async recordMovement(
    params: StockMovementParams,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;

    // Fetch current product with tenant boundary check
    const product = await db.product.findFirst({
      where: {
        id: params.productId,
        businessId: params.businessId,
      },
    });

    if (!product) {
      throw new AppError('Product not found in this business.', 404, 'PRODUCT_NOT_FOUND');
    }

    const beforeQuantity = product.currentStock;
    const afterQuantity = beforeQuantity + params.quantity;

    // Check negative stock constraint if negative stock is disallowed
    const business = await db.business.findUnique({
      where: { id: params.businessId },
      select: { allowNegativeStock: true },
    });

    if (afterQuantity < 0 && !business?.allowNegativeStock) {
      throw new AppError(
        `Insufficient stock for "${product.name}" (Part: ${product.partNumber}). Available: ${beforeQuantity}, Requested deduction: ${Math.abs(params.quantity)}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    // Create the ledger entry
    const movement = await db.stockMovement.create({
      data: {
        businessId: params.businessId,
        productId: params.productId,
        locationId: params.locationId || 'DEFAULT',
        movementType: params.movementType,
        quantity: params.quantity,
        beforeQuantity,
        afterQuantity,
        unitCost: params.unitCost ?? product.purchaseCost,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        userId: params.userId,
        notes: params.notes,
      },
    });

    // Update the product currentStock
    await db.product.update({
      where: { id: product.id },
      data: { currentStock: afterQuantity },
    });

    // Create low-stock / out-of-stock notification if threshold crossed
    if (afterQuantity <= product.minStock) {
      const type = afterQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
      const title = afterQuantity === 0 ? 'Out of Stock Alert' : 'Low Stock Warning';
      const message = `Product "${product.name}" (${product.partNumber}) has ${afterQuantity} units remaining (Min Threshold: ${product.minStock}).`;

      await db.notification.create({
        data: {
          businessId: params.businessId,
          type,
          title,
          message,
          linkUrl: `/app/products?id=${product.id}`,
        },
      });
    }

    return { movement, beforeQuantity, afterQuantity };
  }
}
