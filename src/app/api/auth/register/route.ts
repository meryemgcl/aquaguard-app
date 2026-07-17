/* ============================================================
   POST /api/auth/register
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { createToken } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Ad, e-posta ve şifre gereklidir.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ['admin', 'uzman', 'yonetici', 'halk'];
    const userRole: UserRole = validRoles.includes(role) ? role : 'halk';

    const user = await createUser({ name, email, password, role: userRole });

    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Kayıt başarılı!',
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
    const message = error instanceof Error ? error.message : 'Sunucu hatası oluştu.';
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}
