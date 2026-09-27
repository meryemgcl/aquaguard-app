/* ============================================================
   POST /api/auth/register — Kayıt + Hoşgeldin Maili
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { createToken } from '@/lib/auth';
import {
  sendRoleRequestAdminMail,
  sendRoleRequestMail,
  sendWelcomeMail,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Geçersiz istek gövdesi.' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: 'Geçersiz istek gövdesi.' },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const requestedRole = input.requestedRole;

  if (!name || name.length > 100 || !email || email.length > 254 || !password) {
    return NextResponse.json(
      { success: false, message: 'Geçerli ad, e-posta ve şifre gereklidir.' },
      { status: 400 }
    );
  }

  if (password.length < 6 || password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, message: 'E-posta veya şifre biçimi geçersiz.' },
      { status: 400 }
    );
  }
  if (requestedRole !== undefined && requestedRole !== 'uzman' && requestedRole !== 'yonetici') {
    return NextResponse.json(
      { success: false, message: 'Bu rol için self-service başvuru yapılamaz.' },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({
      name,
      email,
      password,
      ...(requestedRole === 'uzman' || requestedRole === 'yonetici' ? { requestedRole } : {}),
    });

    if (user.accountStatus === 'pending' && user.requestedRole) {
      await Promise.all([
        sendRoleRequestMail(user.email, user.name, user.requestedRole),
        sendRoleRequestAdminMail(user.name, user.email, user.requestedRole),
      ]);
      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Rol talebiniz alındı. Yönetici onayından sonra e-posta ile bilgilendirileceksiniz.',
      });
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      twoFactorVerified: true,
    });

    void sendWelcomeMail(email, name, user.role).catch((error: unknown) => {
      console.error('[Welcome email failed]', error);
    });

    const response = NextResponse.json({
      success: true,
      message: 'Kayıt başarılı.',
      token,
      user,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    const isDuplicate = error instanceof Error && error.message.includes('zaten kayıtlı');
    return NextResponse.json(
      {
        success: false,
        message: isDuplicate ? 'Bu e-posta adresi zaten kayıtlı.' : 'Kayıt işlemi tamamlanamadı.',
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
