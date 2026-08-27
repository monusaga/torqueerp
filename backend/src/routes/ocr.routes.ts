import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { LocalOCRService } from '../services/ocrService.js';

const router = Router();
const ocrService = new LocalOCRService();

const ocrPayloadSchema = z.object({
  text: z.string().optional(),
  imageBase64: z.string().optional(),
});

// POST /api/v1/ocr/process - Extracts structured spare parts fields with confidence scores
router.post('/process', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ocrPayloadSchema.parse(req.body);

    const input = data.text || data.imageBase64 || '';
    const extracted = await ocrService.processImage(input);

    res.json({
      success: true,
      extracted,
      safetyNotice: 'Extracted fields are suggestions. Please review and confirm before saving.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
