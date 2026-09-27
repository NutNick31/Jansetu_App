import { Router } from 'express';
import { z } from 'zod';
import { districtsCol, listAll } from '../../services/firestore';
import { calculatePriorityIndex, DEFAULT_WEIGHTS, maxDemand } from '../../services/priority';
import { InfrastructureCategorySchema } from '../../types/schemas';

const WeightsSchema = z.object({
  demandVolume: z.number().min(0).max(1),
  infraDeficit: z.number().min(0).max(1),
  vulnerability: z.number().min(0).max(1),
});

const BodySchema = z.object({
  weights: WeightsSchema.optional(),
  category: InfrastructureCategorySchema.nullable().optional(),
});

export const priorityRouter = Router();

priorityRouter.post('/simulate', async (req, res) => {
  const { weights, category } = BodySchema.parse(req.body ?? {});
  const effectiveWeights = weights ?? DEFAULT_WEIGHTS;
  const effectiveCategory = category ?? null;

  const districts = await listAll(districtsCol());
  const cap = maxDemand(districts);

  const ranked = districts
    .map((d) => ({
      districtId: d.districtId,
      districtName: d.districtName,
      state: d.state,
      citizenDemandCount: d.citizenDemandCount,
      vulnerabilityIndex: d.vulnerabilityIndex,
      unspentPFMSFundsCr: d.unspentPFMSFundsCr,
      priorityIndex: calculatePriorityIndex(d, cap, effectiveWeights, effectiveCategory),
    }))
    .sort((a, b) => b.priorityIndex - a.priorityIndex);

  res.json({
    weights: effectiveWeights,
    category: effectiveCategory,
    maxDemandInDataset: cap,
    ranked,
  });
});
