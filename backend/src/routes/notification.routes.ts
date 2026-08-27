import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/notifications
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { businessId: req.business!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { businessId: req.business!.id, isRead: false },
    });

    res.json({ data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { id: String(req.params.id), businessId: req.business!.id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
