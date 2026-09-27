import type { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { AppError } from './error';
import { getFirebaseApp } from '../config/firebase';
import { env } from '../config/env';

export type Role = 'citizen' | 'policymaker';

export interface AuthUser {
  uid: string;
  email: string | null;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function policymakerEmails(): Set<string> {
  const raw = env.POLICYMAKER_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function resolveRole(email: string | null): Role {
  if (!email) return 'citizen';
  return policymakerEmails().has(email.toLowerCase()) ? 'policymaker' : 'citizen';
}

async function verifyBearerToken(req: Request): Promise<AuthUser | null> {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const idToken = match[1];
  const decoded = await getAuth(getFirebaseApp()).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    role: resolveRole(decoded.email ?? null),
  };
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await verifyBearerToken(req);
    if (user) req.user = user;
    next();
  } catch {
    // Ignore verification failures here — requireAuth handles the rejection.
    next();
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  next();
}

export function requirePolicymaker(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  if (req.user.role !== 'policymaker') {
    throw new AppError(403, 'Policymaker role required', 'FORBIDDEN');
  }
  next();
}
