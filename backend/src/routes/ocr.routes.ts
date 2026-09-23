import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticateJwt, requireTenant } from '../middleware/auth.js';
import { LocalOCRService } from '../services/ocrService.js';

const router = Router();
const ocrService = new LocalOCRService();

// The server only parses text. Character recognition happens on the device:
// Tesseract.js in the browser, ML Kit on Android. An image sent on its own
// used to be "parsed" as if its base64 bytes were label text, which always
// produced empty or garbage fields, so it is now rejected with a clear error.
const ocrPayloadSchema = z.object({
  text: z.string().max(20000).optional(),
  imageBase64: z.string().optional(),
});

const SAFETY_NOTICE = 'Extracted fields are suggestions. Please review and confirm before saving.';

function textOrReject(data: z.infer<typeof ocrPayloadSchema>, res: Response): string | null {
  const text = (data.text || '').trim();
  if (text) return text;
  res.status(400).json({
    error: {
      code: 'OCR_TEXT_REQUIRED',
      message: data.imageBase64
        ? 'Send the recognised label text in "text". Images are read on the device, not on the server.'
        : 'No label text was received. Hold the label flat, in good light, and try again.',
    },
  });
  return null;
}

// POST /api/v1/ocr/process - Extracts structured spare parts fields with confidence scores
router.post('/process', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ocrPayloadSchema.parse(req.body);
    const text = textOrReject(data, res);
    if (text === null) return;

    const extracted = await ocrService.processImage(text);
    res.json({ success: true, extracted, safetyNotice: SAFETY_NOTICE });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ocr/demo - Public "Try Interactive Camera OCR" on the landing page.
// Pure text parsing: no database access, no tenant data, small payload, and
// its own rate limit so it cannot be used to load the server.
const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many scans, please wait a minute.' } },
});

const demoPayloadSchema = z.object({ text: z.string().max(4000).optional() });

router.post('/demo', demoLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = demoPayloadSchema.parse(req.body);
    const text = textOrReject(data, res);
    if (text === null) return;

    const extracted = ocrService.parseExtractedText(text);
    res.json({ success: true, extracted, safetyNotice: SAFETY_NOTICE });
  } catch (error) {
    next(error);
  }
});

export default router;
