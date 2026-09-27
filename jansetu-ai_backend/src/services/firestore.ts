import type {
  CollectionReference,
  DocumentData,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import type {
  CitizenRequest,
  DistrictMetric,
  GovernmentScheme,
  NudgeAlert,
  RecommendedProject,
} from '../types/domain';

export const COLLECTIONS = {
  requests: 'requests',
  districts: 'districts',
  schemes: 'schemes',
  projects: 'projects',
  nudges: 'nudges',
} as const;

// Extractor allows collections that use non-standard primary key names (e.g. `districtId`).
function converter<T extends object>(idField: keyof T): FirestoreDataConverter<T> {
  return {
    toFirestore(entity: T): DocumentData {
      const clone = { ...entity } as Record<string, unknown>;
      delete clone[idField as string];
      return clone;
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return { [idField]: snap.id, ...(snap.data() as object) } as T;
    },
  };
}

// Firestore rejects nested arrays, so district polygons are stored as {lat,lng} objects.
const districtConverter: FirestoreDataConverter<DistrictMetric> = {
  toFirestore(entity: DistrictMetric): DocumentData {
    const { districtId: _id, h3HexCoordinates, ...rest } = entity;
    return {
      ...rest,
      h3HexCoordinates: h3HexCoordinates.map(([lat, lng]) => ({ lat, lng })),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot): DistrictMetric {
    const data = snap.data() as Omit<DistrictMetric, 'districtId' | 'h3HexCoordinates'> & {
      h3HexCoordinates: Array<{ lat: number; lng: number }>;
    };
    return {
      districtId: snap.id,
      ...data,
      h3HexCoordinates: data.h3HexCoordinates.map(({ lat, lng }) => [lat, lng] as [number, number]),
    };
  },
};

export const requestsCol = (): CollectionReference<CitizenRequest> =>
  db().collection(COLLECTIONS.requests).withConverter(converter<CitizenRequest>('id'));

export const districtsCol = (): CollectionReference<DistrictMetric> =>
  db().collection(COLLECTIONS.districts).withConverter(districtConverter);

export const schemesCol = (): CollectionReference<GovernmentScheme> =>
  db().collection(COLLECTIONS.schemes).withConverter(converter<GovernmentScheme>('id'));

export const projectsCol = (): CollectionReference<RecommendedProject> =>
  db().collection(COLLECTIONS.projects).withConverter(converter<RecommendedProject>('id'));

export const nudgesCol = (): CollectionReference<NudgeAlert> =>
  db().collection(COLLECTIONS.nudges).withConverter(converter<NudgeAlert>('id'));

export async function getById<T>(
  col: CollectionReference<T>,
  id: string,
): Promise<T | undefined> {
  const snap: DocumentSnapshot<T> = await col.doc(id).get();
  return snap.exists ? snap.data() : undefined;
}

export async function listAll<T>(col: CollectionReference<T>): Promise<T[]> {
  const snap = await col.get();
  return snap.docs.map((d) => d.data());
}

export async function upsert<T>(
  col: CollectionReference<T>,
  id: string,
  entity: T,
): Promise<T> {
  await col.doc(id).set(entity);
  return entity;
}

export function docIdFor(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}
