import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { db } from './config/firebase';
import { env } from './config/env';
import { attachUser } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { httpLogger, logger } from './middleware/logger';
import { apiRouter } from './modules';
import { docsRouter } from './modules/docs/router';

const app = express();

app.disable('x-powered-by');
// Swagger UI needs relaxed CSP to load its own inline styles / bundle.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(httpLogger);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/firestore', async (_req, res, next) => {
  try {
    const collections = await db().listCollections();
    res.json({
      status: 'ok',
      projectId: env.FIREBASE_PROJECT_ID,
      collections: collections.map((c) => c.id),
    });
  } catch (err) {
    next(err);
  }
});

// Docs are public — mounted before /api auth attach so anyone can read the spec.
app.use('/api/docs', docsRouter);

app.use('/api', attachUser, apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'jansetu backend listening');
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
