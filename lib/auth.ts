/* ============================================================
   AquaGuard — Edge Compatible JWT Auth Utilities (Phase 1)
   ============================================================ */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { JWTPayload } from './types';

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'aquaguard-super-secret-key-2026');

/* ── Token Operations (Edge Compatible with jose) ── */

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/* ── Password Operations (Node.js only - do not use in middleware) ── */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
