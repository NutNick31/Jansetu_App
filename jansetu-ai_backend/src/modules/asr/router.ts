import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../../middleware/error';
import { transcribeAudio } from '../../services/gemini';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Gemini accepts these mime types; extend the list as more channels come online.
const ALLOWED_MIMES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
]);

export const asrRouter = Router();

asrRouter.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) throw new AppError(400, 'audio field is required', 'AUDIO_REQUIRED');
  const mime = req.file.mimetype.toLowerCase();
  if (!mime.startsWith('audio/') || !ALLOWED_MIMES.has(mime)) {
    throw new AppError(400, `unsupported audio mime type: ${mime}`, 'INVALID_MIME');
  }
  const base64 = req.file.buffer.toString('base64');
  const result = await transcribeAudio(base64, mime);
  res.json(result);
});
