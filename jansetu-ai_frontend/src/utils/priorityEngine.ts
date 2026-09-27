import type { DistrictMetric } from '../types';

export interface PriorityWeights {
  demandVolume: number; // w1, default 0.40
  infraDeficit: number; // w2, default 0.35
  vulnerability: number; // w3, default 0.25
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  demandVolume: 0.40,
  infraDeficit: 0.35,
  vulnerability: 0.25,
};

/**
 * Calculates the Composite Priority Index (PI) for a spatial unit / district
 * PI = w1 * Normalized(Demand Volume) + w2 * Normalized(Infra Deficit) + w3 * Normalized(Socio-Economic Vulnerability)
 * Result scaled to 0 - 100 range.
 */
export function calculatePriorityIndex(
  district: DistrictMetric,
  maxDemandInDataset: number = 100,
  weights: PriorityWeights = DEFAULT_WEIGHTS,
  selectedCategoryDeficit: number | null = null
): number {
  // 1. Normalized Demand Volume (0 - 1)
  const normDemand = Math.min(1.0, district.citizenDemandCount / Math.max(1, maxDemandInDataset));

  // 2. Normalized Infra Deficit (0 - 1)
  let deficitVal = selectedCategoryDeficit !== null 
    ? selectedCategoryDeficit 
    : (district.roadDeficitIndex + district.waterDeficitIndex + district.healthDeficitIndex + district.schoolDeficitIndex + district.powerDeficitIndex) / 5;
  
  const normDeficit = deficitVal / 100;

  // 3. Socio-Economic Vulnerability (already 0 - 1)
  const normVulnerability = Math.min(1.0, Math.max(0.0, district.vulnerabilityIndex));

  // Composite sum
  const rawPI = (weights.demandVolume * normDemand) + 
                (weights.infraDeficit * normDeficit) + 
                (weights.vulnerability * normVulnerability);

  // Normalize total weights if user adjusted sliders
  const totalWeight = weights.demandVolume + weights.infraDeficit + weights.vulnerability;
  const normalizedPI = (rawPI / (totalWeight || 1)) * 100;

  return Math.round(normalizedPI * 10) / 10;
}

/**
 * Generates an H3 spatial hexagonal polygon boundary around center [lat, lng]
 */
export function generateH3HexagonPolygon(centerLat: number, centerLng: number, radiusKm: number = 0.18): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  const kmPerLatDegree = 111.0;
  const kmPerLngDegree = 111.0 * Math.cos((centerLat * Math.PI) / 180);

  for (let i = 0; i < 6; i++) {
    const angleRad = (i * 60 + 30) * (Math.PI / 180);
    const dLat = (radiusKm * Math.sin(angleRad)) / kmPerLatDegree;
    const dLng = (radiusKm * Math.cos(angleRad)) / kmPerLngDegree;
    coordinates.push([centerLat + dLat, centerLng + dLng]);
  }
  return coordinates;
}
