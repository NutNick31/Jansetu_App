import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { requirePolicymaker } from '../../middleware/auth';
import { logger } from '../../middleware/logger';
import { districtsCol, getById, listAll, projectsCol, requestsCol, schemesCol } from '../../services/firestore';
import { recommendProjects } from '../../services/recommend';
import { fireNudge } from '../nudges/router';
import { InfrastructureCategorySchema, RecommendedProjectSchema } from '../../types/schemas';
import type { CitizenRequest, NudgeAlert, RecommendedProject } from '../../types/domain';

const WeightsSchema = z.object({
  demandVolume: z.number().min(0).max(1),
  infraDeficit: z.number().min(0).max(1),
  vulnerability: z.number().min(0).max(1),
});

const RecommendBodySchema = z.object({
  weights: WeightsSchema.optional(),
  category: InfrastructureCategorySchema.nullable().optional(),
  topN: z.number().int().min(1).max(10).optional(),
  useGemini: z.boolean().optional(),
});

export const projectsRouter = Router();

projectsRouter.get('/', async (_req, res) => {
  const projects = await listAll(projectsCol());
  res.json({ projects });
});

projectsRouter.post('/recommend', async (req, res) => {
  const { weights, category, topN, useGemini } = RecommendBodySchema.parse(req.body ?? {});
  const [districts, schemes] = await Promise.all([listAll(districtsCol()), listAll(schemesCol())]);
  const projects = await recommendProjects(districts, schemes, {
    weights,
    category: category ?? null,
    topN,
    useGemini,
  });
  res.json({ projects });
});

projectsRouter.get('/:id', async (req, res) => {
  const found = await getById(projectsCol(), req.params.id);
  if (!found) throw new AppError(404, `Project ${req.params.id} not found`, 'PROJECT_NOT_FOUND');
  res.json({ project: found });
});

projectsRouter.post('/', requirePolicymaker, async (req, res) => {
  const project = RecommendedProjectSchema.parse(req.body);
  await projectsCol().doc(project.id).set(project);
  res.status(201).json({ project });
});

async function findLinkedRequests(project: RecommendedProject): Promise<CitizenRequest[]> {
  const all = await listAll(requestsCol());
  return all.filter((r) => r.district === project.district && r.category === project.category);
}

function buildStatusText(project: RecommendedProject): string {
  const sector = project.category.replace('_', ' ');
  return `🎉 Namaste! Your ${sector} report for ${project.district} has driven a ₹${project.estimatedBudgetCr} Cr sanction under ${project.matchedSchemeAcronym}. Work order for "${project.title}" begins soon. – JanSetu AI DPI.`;
}

projectsRouter.post('/:id/sanction', requirePolicymaker, async (req, res) => {
  const id = String(req.params.id);
  const found = await getById(projectsCol(), id);
  if (!found) throw new AppError(404, `Project ${id} not found`, 'PROJECT_NOT_FOUND');
  const updated: RecommendedProject = { ...found, status: 'sanctioned' };
  await projectsCol().doc(id).set(updated);

  const linked = await findLinkedRequests(updated);
  const statusText = buildStatusText(updated);
  const nudges: NudgeAlert[] = [];
  for (const request of linked) {
    try {
      nudges.push(await fireNudge(request, statusText));
    } catch (err) {
      logger.warn({ err, requestId: request.id, projectId: updated.id }, 'sanction fanout nudge failed');
    }
  }
  res.json({ project: updated, nudgeCount: nudges.length, nudges });
});
