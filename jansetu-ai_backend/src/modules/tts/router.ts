import { Router } from 'express';
import { z } from 'zod';
import { synthesizeSpeech } from '../../services/gemini';

const BodySchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().min(1).max(40).optional(),
});

export const ttsRouter = Router();

ttsRouter.post('/', async (req, res) => {
  const { text, voice } = BodySchema.parse(req.body);
  const wav = await synthesizeSpeech(text, voice);
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Length', wav.length.toString());
  res.setHeader('Cache-Control', 'no-store');
  res.send(wav);
});
