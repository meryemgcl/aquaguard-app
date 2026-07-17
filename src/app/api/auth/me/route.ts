/* ============================================================
   GET /api/auth/me — Get current user from token
   POST /api/auth/me — Logout (clear cookie)
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findUserById, toSafeUser } from '@/lib/users';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Oturum bulunamadı.' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz oturum.' },
        { status: 401 }
      );
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: toSafeUser(user),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası.' },
      { status: 500 }
    );
  }
}

/* Logout */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Çıkış yapıldı.',
  });

  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
