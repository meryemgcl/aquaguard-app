/* ============================================================
   GET /api/auth/me — Get current user from token
   POST /api/auth/me — Logout (clear cookie)
   PUT /api/auth/me — Update user profile
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createToken } from '@/lib/auth';
import { findUserById, updateUser, toSafeUser } from '@/lib/users';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Oturum bulunamadı.' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
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

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { name, password } = await request.json();

    const updateData: any = { name };
    if (password) updateData.passwordHash = password;
    const updated = await updateUser(payload.userId, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, user: updated });
    
    if (name || password) {
      const newToken = await createToken({
        userId: updated.id,
        email: updated.email,
        role: updated.role,
        name: updated.name
      });
      response.cookies.set({
        name: 'token',
        value: newToken,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
