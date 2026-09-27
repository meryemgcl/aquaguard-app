/* ============================================================
   AquaGuard — Edge Compatible JWT Auth Utilities (Phase 1)
   ============================================================ */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { JWTPayload } from './types';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET ortam değişkeni tanımlı ve en az 32 karakter olmalıdır.');
  }
  return new TextEncoder().encode(secret);
};

/* ── Token Operations (Edge Compatible with jose) ── */

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const { userId, email, role, name, twoFactorVerified, twoFactorChallenge } = payload;
    const validRoles: JWTPayload['role'][] = ['super_admin', 'admin', 'uzman', 'yonetici', 'halk'];

    if (
      typeof userId !== 'string' ||
      !userId ||
      typeof email !== 'string' ||
      !email ||
      typeof name !== 'string' ||
      !name ||
      typeof role !== 'string' ||
      !validRoles.includes(role as JWTPayload['role']) ||
      (twoFactorVerified !== undefined && typeof twoFactorVerified !== 'boolean') ||
      (twoFactorChallenge !== undefined && typeof twoFactorChallenge !== 'boolean')
    ) {
      return null;
    }

    return {
      userId,
      email,
      name,
      role: role as JWTPayload['role'],
      twoFactorVerified,
      twoFactorChallenge,
    };
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

/* ── Two-Factor Authentication (2FA) ── */

export function generateTwoFactorSecret(email: string): { secret: string; qrCode: string } {
  const secret = speakeasy.generateSecret({
    name: `AquaGuard (${email})`,
    issuer: 'AquaGuard',
  });

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url || '',
  };
}

export async function generateQRCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow ±2 time windows (30 seconds each)
  });
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => bcrypt.hash(code, 10)));
}

export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
  for (const hashedCode of hashedCodes) {
    const match = await bcrypt.compare(code, hashedCode);
    if (match) return true;
  }
  return false;
}
