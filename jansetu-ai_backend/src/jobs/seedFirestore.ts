import { db } from '../config/firebase';
import { logger } from '../middleware/logger';
import {
  COLLECTIONS,
  districtsCol,
  nudgesCol,
  projectsCol,
  requestsCol,
  schemesCol,
} from '../services/firestore';
import type { CollectionReference } from 'firebase-admin/firestore';
import {
  INITIAL_CITIZEN_REQUESTS,
  INITIAL_NUDGES,
  INITIAL_RECOMMENDED_PROJECTS,
  MOCK_DISTRICTS,
  MOCK_GOVERNMENT_SCHEMES,
} from '../data/seed-data';

async function seedCollection<T>(
  name: string,
  col: CollectionReference<T>,
  docs: T[],
  idOf: (doc: T) => string,
): Promise<void> {
  const existing = await col.limit(1).get();
  if (!existing.empty) {
    logger.info({ collection: name, existingCount: (await col.count().get()).data().count }, 'skip (already populated)');
    return;
  }
  const batch = db().batch();
  for (const doc of docs) {
    batch.set(col.doc(idOf(doc)), doc);
  }
  await batch.commit();
  logger.info({ collection: name, written: docs.length }, 'seeded');
}

async function main(): Promise<void> {
  logger.info('seed starting');
  await seedCollection(COLLECTIONS.districts, districtsCol(), MOCK_DISTRICTS, (d) => d.districtId);
  await seedCollection(COLLECTIONS.schemes, schemesCol(), MOCK_GOVERNMENT_SCHEMES, (d) => d.id);
  await seedCollection(COLLECTIONS.requests, requestsCol(), INITIAL_CITIZEN_REQUESTS, (d) => d.id);
  await seedCollection(COLLECTIONS.projects, projectsCol(), INITIAL_RECOMMENDED_PROJECTS, (d) => d.id);
  await seedCollection(COLLECTIONS.nudges, nudgesCol(), INITIAL_NUDGES, (d) => d.id);
  logger.info('seed complete');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error({ err }, 'seed failed');
    process.exit(1);
  });
