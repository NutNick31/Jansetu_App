import { z } from 'zod';
import { logger } from '../middleware/logger';
import type {
  DistrictMetric,
  GovernmentScheme,
  InfrastructureCategory,
  RecommendedProject,
} from '../types/domain';
import { runJsonPrompt } from './gemini';
import { calculatePriorityIndex, DEFAULT_WEIGHTS, maxDemand, type PriorityWeights } from './priority';

interface DominantDeficit {
  sector: string;
  category: InfrastructureCategory;
  deficitValue: number;
}

function pickDominantDeficit(d: DistrictMetric, restrictTo: InfrastructureCategory | null): DominantDeficit {
  const options: DominantDeficit[] = [
    { sector: 'road connectivity', category: 'rural_roads', deficitValue: d.roadDeficitIndex },
    { sector: 'clean water', category: 'clean_water', deficitValue: d.waterDeficitIndex },
    { sector: 'primary healthcare', category: 'healthcare', deficitValue: d.healthDeficitIndex },
    { sector: 'school infrastructure', category: 'school_upgrades', deficitValue: d.schoolDeficitIndex },
    { sector: 'rural power grid', category: 'power_grid', deficitValue: d.powerDeficitIndex },
    // Sanitation shares data with water (both Jal Shakti Ministry); use waterDeficitIndex as proxy.
    { sector: 'sanitation and drainage', category: 'sanitation_drainage', deficitValue: d.waterDeficitIndex },
  ];
  if (restrictTo) {
    const forced = options.find((o) => o.category === restrictTo);
    if (forced) return forced;
  }
  // Exclude sanitation from the "pick the highest" pass to avoid double-counting water deficit.
  const nonSanitation = options.filter((o) => o.category !== 'sanitation_drainage');
  return nonSanitation.reduce((max, o) => (o.deficitValue > max.deficitValue ? o : max), nonSanitation[0]);
}

function findScheme(schemes: GovernmentScheme[], category: InfrastructureCategory): GovernmentScheme | undefined {
  return schemes
    .filter((s) => s.category === category && s.unallocatedBudgetCr > 0)
    .sort((a, b) => b.unallocatedBudgetCr - a.unallocatedBudgetCr)[0];
}

function estimateBudgetCr(district: DistrictMetric, scheme: GovernmentScheme): number {
  const fromPFMS = district.unspentPFMSFundsCr * 0.15;
  const fromScheme = scheme.unallocatedBudgetCr * 0.001;
  const raw = Math.min(fromPFMS, fromScheme, 8);
  return Math.max(0.5, Math.round(raw * 10) / 10);
}

function estimateReach(district: DistrictMetric): { villages: number; population: number } {
  const roughPop = Math.max(500, Math.round(district.populationDensity * 200 * 0.15));
  const villages = Math.max(5, Math.round(roughPop / 800));
  return { villages, population: roughPop };
}

interface RecommendationSeed {
  district: DistrictMetric;
  scheme: GovernmentScheme;
  dominant: DominantDeficit;
  budgetCr: number;
  reach: { villages: number; population: number };
  priorityScore: number;
}

function templatedTitle(seed: RecommendationSeed): string {
  const { district, dominant } = seed;
  const map: Record<string, string> = {
    rural_roads: `${district.districtName} Multi-Village Road & Bridge Restoration`,
    clean_water: `${district.districtName} Solar Piped-Water Grid Expansion`,
    healthcare: `${district.districtName} Primary Health Centre Modernization`,
    school_upgrades: `${district.districtName} Government School Infrastructure Upgrade`,
    power_grid: `${district.districtName} Rural Micro-Grid Electrification`,
    sanitation_drainage: `${district.districtName} Swachh Bharat Drainage & Greywater Network`,
  };
  return map[dominant.category] ?? `${district.districtName} ${dominant.sector} Project`;
}

interface GeminiPolish {
  title: string;
  oneLiner: string;
}

// Single Gemini call polishes 5 seeds at once to conserve free-tier quota.
async function polishAll(seeds: RecommendationSeed[]): Promise<GeminiPolish[]> {
  if (seeds.length === 0) return [];
  const list = seeds
    .map((s, i) => `${i + 1}. ${s.district.districtName}, ${s.district.state} | dominant deficit: ${s.dominant.sector} (${s.dominant.deficitValue}/100) | scheme: ${s.scheme.acronym} | budget: ₹${s.budgetCr} Cr | reach: ${s.reach.population} citizens`)
    .join('\n');
  const prompt = `You are a NITI Aayog project-writing assistant. For each numbered seed below, write:
  - "title": short (max 12 words) proper-noun project name suitable for a sanction letter
  - "oneLiner": one factual sentence (max 30 words) citing the district, the deficit, the scheme, and the outcome

Seeds:
${list}

Respond ONLY with a JSON object of shape { "items": [{"title": "...", "oneLiner": "..."}, ...] }, exactly ${seeds.length} items in the same order as the seeds.`;

  const schema = z.object({
    items: z
      .array(
        z.object({
          title: z.string().min(1),
          oneLiner: z.string().default(''),
        }),
      )
      .length(seeds.length),
  });

  try {
    const parsed = await runJsonPrompt(prompt, schema);
    return parsed.items.map((p) => ({ title: p.title.trim(), oneLiner: (p.oneLiner ?? '').trim() }));
  } catch (err) {
    logger.warn({ err }, 'gemini recommend polish failed, using templates');
    return seeds.map((s) => ({ title: templatedTitle(s), oneLiner: '' }));
  }
}

export interface RecommendOptions {
  weights?: PriorityWeights;
  category?: InfrastructureCategory | null;
  topN?: number;
  useGemini?: boolean;
}

export async function recommendProjects(
  districts: DistrictMetric[],
  schemes: GovernmentScheme[],
  opts: RecommendOptions = {},
): Promise<RecommendedProject[]> {
  const { weights = DEFAULT_WEIGHTS, category = null, topN = 5, useGemini = true } = opts;
  const cap = maxDemand(districts);

  const ranked = districts
    .map((d) => ({ d, pi: calculatePriorityIndex(d, cap, weights, category) }))
    .sort((a, b) => b.pi - a.pi)
    .slice(0, topN);

  const seeds: RecommendationSeed[] = [];
  for (const { d, pi } of ranked) {
    const dominant = pickDominantDeficit(d, category);
    const scheme = findScheme(schemes, dominant.category);
    if (!scheme) continue;
    const budgetCr = estimateBudgetCr(d, scheme);
    const reach = estimateReach(d);
    seeds.push({ district: d, scheme, dominant, budgetCr, reach, priorityScore: Math.round(pi * 10) / 10 });
  }

  const polish = useGemini ? await polishAll(seeds) : seeds.map((s) => ({ title: templatedTitle(s), oneLiner: '' }));

  return seeds.map((s, i) => {
    const pol = polish[i] ?? { title: templatedTitle(s), oneLiner: '' };
    const id = `airec_${s.district.districtId}_${s.dominant.category}`;
    return {
      id,
      title: pol.title,
      district: s.district.districtName,
      state: s.district.state,
      category: s.dominant.category,
      affectedVillages: s.reach.villages,
      affectedPopulation: s.reach.population,
      estimatedBudgetCr: s.budgetCr,
      matchedScheme: s.scheme.name,
      matchedSchemeAcronym: s.scheme.acronym,
      priorityScore: s.priorityScore,
      h3ClusterId: s.district.h3Index,
      status: 'recommended',
      justification: pol.oneLiner || undefined,
    } satisfies RecommendedProject;
  });
}
