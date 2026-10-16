import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { JWTPayload, UserRole } from '@/lib/types';
import { findUserById } from '@/lib/users';
import { STAFF_ROLES } from '@/lib/permissions';

export { STAFF_ROLES };

type ApiUserResult =
  | { user: JWTPayload; response?: never }
  | { user?: never; response: NextResponse };

const VALID_ROLES = new Set<UserRole>([
  'super_admin',
  'admin',
  'uzman',
  'yonetici',
  'halk',
]);

export async function requireApiUser(
  request: NextRequest,
  allowedRoles?: readonly UserRole[],
): Promise<ApiUserResult> {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return {
      response: NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 }),
    };
  }

  const claims = await verifyToken(token);
  if (!claims || !claims.userId || !VALID_ROLES.has(claims.role)) {
    return {
      response: NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 }),
    };
  }

  if (claims.twoFactorChallenge && !claims.twoFactorVerified) {
    return {
      response: NextResponse.json({ error: 'İki aşamalı doğrulama tamamlanmalı.' }, { status: 403 }),
    };
  }

  const storedUser = await findUserById(claims.userId);
  if (!storedUser || storedUser.accountStatus !== 'active' || !VALID_ROLES.has(storedUser.role)) {
    return {
      response: NextResponse.json({ error: 'Etkin bir hesapla giriş yapmanız gerekiyor.' }, { status: 401 }),
    };
  }

  if (storedUser.twoFactorEnabled && claims.twoFactorVerified !== true) {
    return {
      response: NextResponse.json({ error: 'İki aşamalı doğrulama tamamlanmalı.' }, { status: 403 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(storedUser.role)) {
    return {
      response: NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 }),
    };
  }

  const user: JWTPayload = {
    userId: storedUser.id,
    email: storedUser.email,
    role: storedUser.role,
    name: storedUser.name,
    twoFactorVerified: claims.twoFactorVerified,
    twoFactorChallenge: claims.twoFactorChallenge,
  };
  return { user };
}
