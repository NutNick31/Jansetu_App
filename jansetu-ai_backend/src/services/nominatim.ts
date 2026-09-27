import axios from 'axios';
import { logger } from '../middleware/logger';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USER_AGENT = 'JanSetuAI/0.1 (hackathon build)';

export interface Coordinates {
  lat: number;
  lng: number;
  displayName: string;
}

interface CacheEntry {
  expires: number;
  value: Coordinates | null;
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

const cache = new Map<string, CacheEntry>();

function keyFor(query: string): string {
  return query.trim().toLowerCase();
}

export async function geocode(query: string): Promise<Coordinates | null> {
  const key = keyFor(query);
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const res = await axios.get<NominatimResult[]>(ENDPOINT, {
      params: { q: query, countrycodes: 'in', format: 'json', limit: 1 },
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      timeout: 8_000,
    });
    const first = res.data?.[0];
    if (!first?.lat || !first?.lon) {
      cache.set(key, { expires: Date.now() + TTL_MS, value: null });
      return null;
    }
    const coords: Coordinates = {
      lat: Number(first.lat),
      lng: Number(first.lon),
      displayName: (first.display_name ?? query).trim(),
    };
    cache.set(key, { expires: Date.now() + TTL_MS, value: coords });
    return coords;
  } catch (err) {
    logger.warn({ err, query }, 'nominatim geocode failed');
    return null;
  }
}
