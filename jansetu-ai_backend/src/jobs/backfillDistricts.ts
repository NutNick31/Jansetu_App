import { latLngToCell } from 'h3-js';
import { logger } from '../middleware/logger';
import { matchDistrictByName, provisionDistrict } from '../services/districts';
import { districtsCol, listAll, requestsCol } from '../services/firestore';
import { calculatePriorityIndex, maxDemand } from '../services/priority';
import type { CitizenRequest, DistrictMetric } from '../types/domain';

async function main(): Promise<void> {
  const [requests, districts] = await Promise.all([listAll(requestsCol()), listAll(districtsCol())]);
  logger.info({ requests: requests.length, districts: districts.length }, 'backfill starting');

  const byName = new Map<string, { state: string; count: number; sample: CitizenRequest }>();
  for (const r of requests) {
    if (!r.district) continue;
    if (matchDistrictByName(districts, r.district)) continue;
    const key = r.district.toLowerCase().trim();
    const entry = byName.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      byName.set(key, { state: r.state ?? 'India', count: 1, sample: r });
    }
  }

  if (byName.size === 0) {
    logger.info('nothing to backfill');
    return;
  }

  const created: DistrictMetric[] = [];
  for (const [name, info] of byName) {
    try {
      const d = await provisionDistrict(info.sample.district, info.state);
      d.h3Index = latLngToCell(d.lat, d.lng, 8);
      d.citizenDemandCount = info.count;
      created.push(d);
      logger.info({ id: d.districtId, name: d.districtName, count: info.count }, 'provisioned');
    } catch (err) {
      logger.warn({ err, name }, 'backfill: provisionDistrict failed');
    }
  }

  // Second pass: renormalize PI for the newly created districts against the fresh max.
  const all = [...districts, ...created];
  const cap = maxDemand(all);
  for (const d of created) {
    const pi = calculatePriorityIndex(d, cap);
    await districtsCol().doc(d.districtId).update({
      citizenDemandCount: d.citizenDemandCount,
      priorityIndex: pi,
      h3Index: d.h3Index,
    });
    logger.info({ id: d.districtId, pi }, 'PI set');
  }
  logger.info({ backfilled: created.length }, 'backfill complete');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error({ err }, 'backfill failed');
    process.exit(1);
  });
