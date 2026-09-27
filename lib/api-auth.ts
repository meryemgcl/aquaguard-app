import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { JWTPayload, UserRole } from '@/lib/types';

export const STAFF_ROLES: readonly UserRole[] = [
  'super_admin',
  'admin',
  'uzman',
  'yonetici',
];

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

  const user = await verifyToken(token);
  if (!user || !user.userId || !VALID_ROLES.has(user.role)) {
    return {
      response: NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 }),
    };
  }

  if (user.twoFactorChallenge && !user.twoFactorVerified) {
    return {
      response: NextResponse.json({ error: 'İki aşamalı doğrulama tamamlanmalı.' }, { status: 403 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      response: NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 }),
    };
  }

  return { user };
}
