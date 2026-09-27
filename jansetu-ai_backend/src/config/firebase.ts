import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { env } from './env';
import { logger } from '../middleware/logger';

let app: App | undefined;
let firestore: Firestore | undefined;

function loadServiceAccount(): Record<string, unknown> | null {
  // 1. Preferred on Render/Netlify: whole JSON base64-encoded in an env var.
  if (env.FIREBASE_SERVICE_ACCOUNT_B64) {
    try {
      const decoded = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf-8');
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch (err) {
      logger.warn({ err }, 'FIREBASE_SERVICE_ACCOUNT_B64 set but not decodable — falling back');
    }
  }
  // 2. Local dev: file path relative to cwd.
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const path = resolve(process.cwd(), env.GOOGLE_APPLICATION_CREDENTIALS);
      return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    } catch (err) {
      logger.warn({ err }, 'GOOGLE_APPLICATION_CREDENTIALS set but file not readable — falling back to ADC');
    }
  }
  // 3. Cloud Run / any GCP runtime with a service account attached: ADC.
  return null;
}

export function getFirebaseApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  const sa = loadServiceAccount();
  app = initializeApp({
    credential: sa ? cert(sa as Parameters<typeof cert>[0]) : applicationDefault(),
    projectId: env.FIREBASE_PROJECT_ID,
  });
  logger.info(
    { projectId: env.FIREBASE_PROJECT_ID, credentialSource: sa ? 'service-account-file' : 'application-default' },
    'firebase admin initialized',
  );
  return app;
}

export function db(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(getFirebaseApp());
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}
