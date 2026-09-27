import { Router } from 'express';
import { z } from 'zod';
import { translateToEnglish } from '../../services/gemini';

const BodySchema = z.object({
  text: z.string().min(1).max(10_000),
  sourceLang: z.string().min(2).max(10).optional(),
});

export const translationRouter = Router();

translationRouter.post('/', async (req, res) => {
  const { text, sourceLang } = BodySchema.parse(req.body);
  const result = await translateToEnglish(text, sourceLang);
  res.json(result);
});
