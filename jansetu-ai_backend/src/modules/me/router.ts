import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';

export const meRouter = Router();

meRouter.get('/', requireAuth, (req, res) => {
  const user = req.user!;
  res.json({ uid: user.uid, email: user.email, role: user.role });
});
