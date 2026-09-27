import pino from 'pino';
import pinoHttp from 'pino-http';
import { env, isProduction } from '../config/env';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: { service: 'jansetu-ai-backend', env: env.NODE_ENV },
  transport: isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } },
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
