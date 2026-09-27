import { Router } from 'express';
import { z } from 'zod';
import { districtsCol, getById, listAll } from '../../services/firestore';
import { queryCopilot } from '../../services/gemini';
import type { DistrictMetric } from '../../types/domain';

const BodySchema = z.object({
  query: z.string().min(3).max(1000),
  contextDistrictIds: z.array(z.string()).max(20).optional(),
});

function summarizeDistrict(d: DistrictMetric): Record<string, unknown> {
  return {
    id: d.districtId,
    name: d.districtName,
    state: d.state,
    priorityIndex: d.priorityIndex,
    citizenDemandCount: d.citizenDemandCount,
    unspentPFMSFundsCr: d.unspentPFMSFundsCr,
    aspirationalDistrict: d.aspirationalDistrict,
    deficits: {
      road: d.roadDeficitIndex,
      water: d.waterDeficitIndex,
      health: d.healthDeficitIndex,
      school: d.schoolDeficitIndex,
      power: d.powerDeficitIndex,
    },
    vulnerabilityIndex: d.vulnerabilityIndex,
  };
}

async function buildContext(ids?: string[]): Promise<string> {
  if (ids && ids.length > 0) {
    const docs = await Promise.all(ids.map((id) => getById(districtsCol(), id)));
    const scoped = docs.filter((d): d is DistrictMetric => Boolean(d)).map(summarizeDistrict);
    return JSON.stringify({ scope: 'selected', districts: scoped });
  }
  const all = await listAll(districtsCol());
  const top = [...all].sort((a, b) => b.priorityIndex - a.priorityIndex).slice(0, 5).map(summarizeDistrict);
  return JSON.stringify({ scope: 'top5_by_priority', districts: top });
}

export const copilotRouter = Router();

copilotRouter.post('/query', async (req, res) => {
  const { query, contextDistrictIds } = BodySchema.parse(req.body);
  const contextText = await buildContext(contextDistrictIds);
  const answer = await queryCopilot(query, contextText);
  res.json({ answer });
});
