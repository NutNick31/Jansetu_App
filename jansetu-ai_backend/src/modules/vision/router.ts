import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { analyzePhoto } from '../../services/gemini';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const BodySchema = z.object({
  description: z.string().max(2000).optional().default(''),
});

export const visionRouter = Router();

visionRouter.post('/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) throw new AppError(400, 'image field is required', 'IMAGE_REQUIRED');
  if (!req.file.mimetype.startsWith('image/')) {
    throw new AppError(400, 'file must be an image', 'INVALID_MIME');
  }
  const { description } = BodySchema.parse(req.body ?? {});
  const base64 = req.file.buffer.toString('base64');
  const aiDiagnostic = await analyzePhoto(base64, req.file.mimetype, description);
  res.json({ aiDiagnostic });
});
