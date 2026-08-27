import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { INDIAN_VEHICLE_CATALOG, VehicleBrandInfo } from '../data/vehicleCatalog.js';

const router = Router();

const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  vehicleType: z.enum(['TWO_WHEELER', 'FOUR_WHEELER', 'COMMERCIAL', 'EV', 'OTHER']).default('TWO_WHEELER'),
  models: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// GET /api/v1/brands - List all brands (Preloaded + Custom)
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleType, search } = req.query;

    // Fetch tenant custom brands from DB
    const customBrands = await prisma.productBrand.findMany({
      where: {
        businessId: req.business!.id,
      },
    });

    // Merge standard catalog with custom brands
    let allBrands: VehicleBrandInfo[] = [...INDIAN_VEHICLE_CATALOG];

    // Add any custom brand that isn't already in standard catalog
    for (const cb of customBrands) {
      if (!allBrands.some((b) => b.brand.toLowerCase() === cb.name.toLowerCase())) {
        let models: string[] = [];
        try {
          if (cb.description && cb.description.startsWith('[')) {
            models = JSON.parse(cb.description);
          } else if (cb.description) {
            models = [cb.description];
          }
        } catch {
          models = [];
        }

        allBrands.push({
          brand: cb.name,
          vehicleType: 'TWO_WHEELER',
          country: 'India',
          popularModels: models,
        });
      }
    }

    if (vehicleType) {
      allBrands = allBrands.filter((b) => b.vehicleType === vehicleType);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      allBrands = allBrands.filter(
        (b) =>
          b.brand.toLowerCase().includes(q) ||
          b.popularModels.some((m) => m.toLowerCase().includes(q))
      );
    }

    res.json({
      brands: allBrands,
      total: allBrands.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brands - Create a new custom brand & models
router.post('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBrandSchema.parse(req.body);

    const brand = await prisma.productBrand.upsert({
      where: {
        businessId_name: {
          businessId: req.business!.id,
          name: data.name.trim(),
        },
      },
      update: {
        description: data.models ? JSON.stringify(data.models) : data.description,
      },
      create: {
        businessId: req.business!.id,
        name: data.name.trim(),
        description: data.models ? JSON.stringify(data.models) : data.description,
      },
    });

    res.status(201).json({
      brand: {
        id: brand.id,
        name: brand.name,
        models: data.models || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
