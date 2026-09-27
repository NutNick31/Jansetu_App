import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { districtsCol, getById, listAll } from '../../services/firestore';

export const districtsRouter = Router();

districtsRouter.get('/', async (_req, res) => {
  const districts = await listAll(districtsCol());
  res.json({ districts });
});

districtsRouter.get('/:id', async (req, res) => {
  const found = await getById(districtsCol(), req.params.id);
  if (!found) throw new AppError(404, `District ${req.params.id} not found`, 'DISTRICT_NOT_FOUND');
  res.json({ district: found });
});

districtsRouter.get('/:id/metrics', async (req, res) => {
  const found = await getById(districtsCol(), req.params.id);
  if (!found) throw new AppError(404, `District ${req.params.id} not found`, 'DISTRICT_NOT_FOUND');
  res.json({ metrics: found });
});
