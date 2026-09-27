import { latLngToCell } from 'h3-js';
import { db } from '../config/firebase';
import { logger } from '../middleware/logger';
import type { DistrictMetric, InfrastructureCategory } from '../types/domain';
import { matchDistrictByName, provisionDistrict } from './districts';
import { districtsCol, listAll } from './firestore';

export interface PriorityWeights {
  demandVolume: number;
  infraDeficit: number;
  vulnerability: number;
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  demandVolume: 0.4,
  infraDeficit: 0.35,
  vulnerability: 0.25,
};

const CATEGORY_TO_DEFICIT_FIELD: Partial<Record<InfrastructureCategory, keyof DistrictMetric>> = {
  rural_roads: 'roadDeficitIndex',
  clean_water: 'waterDeficitIndex',
  healthcare: 'healthDeficitIndex',
  school_upgrades: 'schoolDeficitIndex',
  power_grid: 'powerDeficitIndex',
};

// Mirrors jansetu-ai_frontend/src/utils/priorityEngine.ts#calculatePriorityIndex.
export function calculatePriorityIndex(
  district: DistrictMetric,
  maxDemandInDataset = 100,
  weights: PriorityWeights = DEFAULT_WEIGHTS,
  selectedCategory: InfrastructureCategory | null = null,
): number {
  const normDemand = Math.min(1.0, district.citizenDemandCount / Math.max(1, maxDemandInDataset));

  const field = selectedCategory ? CATEGORY_TO_DEFICIT_FIELD[selectedCategory] : undefined;
  const categoryValue = field ? Number(district[field]) : null;
  const deficitVal =
    categoryValue !== null && Number.isFinite(categoryValue)
      ? categoryValue
      : (district.roadDeficitIndex +
          district.waterDeficitIndex +
          district.healthDeficitIndex +
          district.schoolDeficitIndex +
          district.powerDeficitIndex) /
        5;
  const normDeficit = deficitVal / 100;

  const normVulnerability = Math.min(1.0, Math.max(0.0, district.vulnerabilityIndex));

  const rawPI =
    weights.demandVolume * normDemand +
    weights.infraDeficit * normDeficit +
    weights.vulnerability * normVulnerability;

  const totalWeight = weights.demandVolume + weights.infraDeficit + weights.vulnerability;
  const normalizedPI = (rawPI / (totalWeight || 1)) * 100;

  return Math.round(normalizedPI * 10) / 10;
}

export function maxDemand(districts: DistrictMetric[]): number {
  return districts.reduce((max, d) => (d.citizenDemandCount > max ? d.citizenDemandCount : max), 1);
}

// Increments the district's demand count and recomputes its priority index in one transaction.
// Auto-provisions a fresh district doc (with defaults + Nominatim coords) if none matches yet.
export async function tickDistrictDemand(
  districtName: string | null | undefined,
  state?: string | null,
): Promise<void> {
  if (!districtName) return;
  const all = await listAll(districtsCol());
  let matched = matchDistrictByName(all, districtName);
  if (!matched) {
    try {
      matched = await provisionDistrict(districtName, state ?? null);
      matched.h3Index = latLngToCell(matched.lat, matched.lng, 8);
      await districtsCol().doc(matched.districtId).update({ h3Index: matched.h3Index });
      logger.info({ districtId: matched.districtId, districtName, state }, 'auto-provisioned district');
      all.push(matched);
    } catch (err) {
      logger.warn({ err, districtName }, 'tickDistrictDemand: auto-provision failed');
      return;
    }
  }
  const projectedMax = Math.max(maxDemand(all), matched.citizenDemandCount + 1);
  const ref = districtsCol().doc(matched.districtId);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data();
    if (!current) return;
    const nextCount = current.citizenDemandCount + 1;
    const nextPI = calculatePriorityIndex(
      { ...current, citizenDemandCount: nextCount },
      projectedMax,
    );
    tx.update(ref, { citizenDemandCount: nextCount, priorityIndex: nextPI });
  });
}
