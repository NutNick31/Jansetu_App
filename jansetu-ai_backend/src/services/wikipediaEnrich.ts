import axios from 'axios';
import { logger } from '../middleware/logger';

const ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USER_AGENT = 'JanSetuAI/0.1 (hackathon build; https://github.com/jansetu)';

export interface WikipediaSummary {
  title: string;
  description?: string;
  extract: string;
  url: string;
}

interface CacheEntry {
  expires: number;
  value: WikipediaSummary | null;
}

interface RawSummary {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  type?: string;
}

const cache = new Map<string, CacheEntry>();

function encodeTitle(title: string): string {
  return encodeURIComponent(title.trim().replace(/\s+/g, '_'));
}

async function fetchOne(title: string): Promise<WikipediaSummary | null> {
  const key = title.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const res = await axios.get<RawSummary>(`${ENDPOINT}/${encodeTitle(title)}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      timeout: 8_000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    // Wikipedia returns 200 with type=disambiguation for ambiguous names; skip those.
    if (res.status !== 200 || !res.data.extract || res.data.type === 'disambiguation') {
      cache.set(key, { expires: Date.now() + TTL_MS, value: null });
      return null;
    }
    const summary: WikipediaSummary = {
      title: res.data.title ?? title,
      description: res.data.description,
      extract: res.data.extract,
      url: res.data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeTitle(title)}`,
    };
    cache.set(key, { expires: Date.now() + TTL_MS, value: summary });
    return summary;
  } catch (err) {
    logger.warn({ err, title }, 'wikipedia fetch failed');
    return null;
  }
}

// Try several title variants; return the first that resolves cleanly.
async function fetchWithFallbacks(candidates: string[]): Promise<WikipediaSummary | null> {
  for (const c of candidates) {
    const result = await fetchOne(c);
    if (result) return result;
  }
  return null;
}

function stripParens(name: string): string {
  return name.replace(/\s*\(.+?\)\s*/g, ' ').trim();
}

// --- Districts ---

export async function fetchDistrictSummary(
  districtName: string,
  state?: string | null,
): Promise<WikipediaSummary | null> {
  const base = stripParens(districtName);
  const candidates = [
    `${base} district`,
    base,
    state ? `${base}, ${state}` : '',
  ].filter(Boolean);
  return fetchWithFallbacks(candidates);
}

// Extracts a 4-9 digit number that looks like a census population from the extract text.
export function extractPopulation(extract: string): number | undefined {
  const match = extract.match(/\bpopulation\b[^.]*?([\d,]{4,15})/i);
  if (!match) return undefined;
  const n = parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 1_000 && n < 50_000_000 ? n : undefined;
}

// --- Schemes ---

// Known Wikipedia titles for our seeded scheme catalog; extend as needed.
const SCHEME_TITLE_OVERRIDES: Record<string, string[]> = {
  'scheme_pmgsy': ['Pradhan Mantri Gram Sadak Yojana'],
  'scheme_jjm': ['Jal Jeevan Mission', 'Har Ghar Jal'],
  'scheme_ab_pmjay': ['Ayushman Bharat Yojana', 'Ayushman Bharat'],
  'scheme_samagra': ['Sarva Shiksha Abhiyan', 'Samagra Shiksha Abhiyan'],
  'scheme_pm_kusum': ['Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan', 'PM-KUSUM'],
  'scheme_swachh': ['Swachh Bharat Mission', 'Swachh Bharat Abhiyan'],
  'scheme_pm_devine': ['North Eastern Council', 'Ministry of Development of North Eastern Region'],
  'scheme_bharatnet': ['BharatNet', 'National Optical Fibre Network'],
};

export async function fetchSchemeSummary(
  schemeId: string,
  name: string,
  acronym: string,
): Promise<WikipediaSummary | null> {
  const overrides = SCHEME_TITLE_OVERRIDES[schemeId] ?? [];
  const candidates = [
    ...overrides,
    name,
    name.replace(/\s*\(.+?\)\s*/g, ' ').trim(),
    acronym,
  ].filter(Boolean);
  return fetchWithFallbacks(candidates);
}
