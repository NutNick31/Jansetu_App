import { describe, expect, it } from 'vitest';
import { calculatePriorityIndex as backendPI } from '../src/services/priority';
import { calculatePriorityIndex as frontendPI } from '../../jansetu-ai_frontend/src/utils/priorityEngine';
import { MOCK_DISTRICTS } from '../src/data/seed-data';
import type { DistrictMetric } from '../src/types/domain';

const PROFILES = [
  { name: 'default', weights: { demandVolume: 0.4, infraDeficit: 0.35, vulnerability: 0.25 } },
  { name: 'all-demand', weights: { demandVolume: 1, infraDeficit: 0, vulnerability: 0 } },
  { name: 'all-deficit', weights: { demandVolume: 0, infraDeficit: 1, vulnerability: 0 } },
  { name: 'all-vulnerability', weights: { demandVolume: 0, infraDeficit: 0, vulnerability: 1 } },
  { name: 'even', weights: { demandVolume: 1 / 3, infraDeficit: 1 / 3, vulnerability: 1 / 3 } },
];

describe('Priority Index parity: backend vs frontend', () => {
  const maxDemand = Math.max(...MOCK_DISTRICTS.map((d) => d.citizenDemandCount));

  for (const profile of PROFILES) {
    describe(`profile: ${profile.name}`, () => {
      for (const d of MOCK_DISTRICTS) {
        it(`${d.districtId}`, () => {
          const a = backendPI(d, maxDemand, profile.weights);
          const b = frontendPI(d as unknown as DistrictMetric, maxDemand, profile.weights);
          expect(a).toBeCloseTo(b, 1);
        });
      }
    });
  }
});
