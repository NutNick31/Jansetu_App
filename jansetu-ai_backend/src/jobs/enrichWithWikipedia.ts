import { logger } from '../middleware/logger';
import { districtsCol, listAll, schemesCol } from '../services/firestore';
import {
  extractPopulation,
  fetchDistrictSummary,
  fetchSchemeSummary,
} from '../services/wikipediaEnrich';

async function main(): Promise<void> {
  logger.info('wiki enrichment starting');

  const [districts, schemes] = await Promise.all([listAll(districtsCol()), listAll(schemesCol())]);

  let districtHits = 0;
  for (const d of districts) {
    if (d.wikipediaSummary) continue;
    const sum = await fetchDistrictSummary(d.districtName, d.state);
    if (!sum) {
      logger.info({ district: d.districtName }, 'no wiki match');
      continue;
    }
    const censusPopulation = extractPopulation(sum.extract);
    await districtsCol().doc(d.districtId).update({
      wikipediaSummary: sum.extract,
      wikipediaUrl: sum.url,
      ...(censusPopulation !== undefined ? { censusPopulation } : {}),
    });
    districtHits += 1;
    logger.info({ district: d.districtName, title: sum.title, censusPopulation }, 'enriched');
  }

  let schemeHits = 0;
  for (const s of schemes) {
    if (s.wikipediaSummary) continue;
    const sum = await fetchSchemeSummary(s.id, s.name, s.acronym);
    if (!sum) {
      logger.info({ scheme: s.acronym }, 'no wiki match');
      continue;
    }
    await schemesCol().doc(s.id).update({
      wikipediaSummary: sum.extract,
      wikipediaUrl: sum.url,
    });
    schemeHits += 1;
    logger.info({ scheme: s.acronym, title: sum.title }, 'enriched');
  }

  logger.info({ districtHits, schemeHits, total: districts.length + schemes.length }, 'wiki enrichment complete');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error({ err }, 'wiki enrichment failed');
    process.exit(1);
  });
