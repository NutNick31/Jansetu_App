import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { getById, projectsCol } from '../../services/firestore';
import { getAuditImages } from '../../services/satelliteAudit';

export const verificationRouter = Router();

verificationRouter.get('/projects/:id/satellite-audit', async (req, res) => {
  const project = await getById(projectsCol(), req.params.id);
  if (!project) throw new AppError(404, `Project ${req.params.id} not found`, 'PROJECT_NOT_FOUND');
  const audit = getAuditImages(project);
  res.json({ projectId: project.id, ...audit });
});
