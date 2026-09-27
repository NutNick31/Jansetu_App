import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'APP_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

// Express 5 catches async rejections automatically; this handles all errors.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error({ err }, 'unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Internal server error' : message,
    },
  });
}
