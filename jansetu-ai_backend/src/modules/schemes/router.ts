import { Router } from 'express';
import { listAll, schemesCol } from '../../services/firestore';

export const schemesRouter = Router();

schemesRouter.get('/', async (_req, res) => {
  const schemes = await listAll(schemesCol());
  res.json({ schemes });
});
