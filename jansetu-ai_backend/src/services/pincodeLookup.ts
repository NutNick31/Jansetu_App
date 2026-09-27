import axios from 'axios';
import { logger } from '../middleware/logger';

const ENDPOINT = 'https://api.postalpincode.in/pincode';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface PincodeInfo {
  pincode: string;
  district: string;
  state: string;
  postOffice: string;
  circle?: string;
}

interface CacheEntry {
  expires: number;
  value: PincodeInfo | null;
}

const cache = new Map<string, CacheEntry>();

interface PostOffice {
  Name?: string;
  District?: string;
  State?: string;
  Circle?: string;
}

interface PincodeResponse {
  Status?: string;
  PostOffice?: PostOffice[] | null;
}

export async function lookupPincode(pincode: string): Promise<PincodeInfo | null> {
  const clean = pincode.replace(/\D/g, '');
  if (clean.length !== 6) return null;

  const cached = cache.get(clean);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const res = await axios.get<PincodeResponse[]>(`${ENDPOINT}/${clean}`, { timeout: 8_000 });
    const first = res.data?.[0];
    if (first?.Status !== 'Success' || !first.PostOffice?.length) {
      cache.set(clean, { expires: Date.now() + TTL_MS, value: null });
      return null;
    }
    const po = first.PostOffice[0];
    const info: PincodeInfo = {
      pincode: clean,
      district: (po.District ?? '').trim(),
      state: (po.State ?? '').trim(),
      postOffice: (po.Name ?? '').trim(),
      circle: po.Circle?.trim(),
    };
    cache.set(clean, { expires: Date.now() + TTL_MS, value: info });
    return info;
  } catch (err) {
    logger.warn({ err, pincode: clean }, 'pincode lookup failed');
    return null;
  }
}
