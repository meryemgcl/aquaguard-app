/* ============================================================
   POST /api/auth/login
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { findUserByEmail, toSafeUser } from '@/lib/users';
import { comparePassword, createToken, getJwtSecret } from '@/lib/auth';

// Best-effort process-local rate limit for a single-instance local deployment.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 dakika

export async function POST(request: NextRequest) {
  try {
    // 1. IP bazlı Rate Limit kontrolü
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const now = Date.now();
    const attempt = rateLimitMap.get(ip);

    if (attempt) {
      if (now - attempt.timestamp < LOCK_TIME_MS && attempt.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, message: 'Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin.' },
          { status: 429 }
        );
      }
      if (now - attempt.timestamp >= LOCK_TIME_MS) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      } else {
        rateLimitMap.set(ip, { count: attempt.count + 1, timestamp: attempt.timestamp });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }

    // 2. Girdi Doğrulama (Server-side validation)
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password || email.length > 100 || password.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz E-posta veya şifre formatı.' },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    if (user.accountStatus === 'pending') {
      return NextResponse.json(
        { success: false, message: 'Hesabınız yönetici onayı bekliyor.' },
        { status: 403 }
      );
    }
    if (user.accountStatus === 'rejected') {
      return NextResponse.json(
        { success: false, message: 'Hesap başvurunuz onaylanmadı. Destek ekibiyle iletişime geçin.' },
        { status: 403 }
      );
    }

    // Başarılı girişte rate limit sıfırlanır
    rateLimitMap.delete(ip);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Create temporary token (expires in 5 minutes)
      const tempToken = await new SignJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        twoFactorVerified: false,
        twoFactorChallenge: true,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(getJwtSecret());

      return NextResponse.json({
        success: true,
        message: '2FA kodu gerekmektedir.',
        requiresTwoFactor: true,
        tempToken,
      }, { status: 200 });
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      twoFactorVerified: true,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Giriş başarılı!',
      token,
      user: toSafeUser(user),
    });

    // 3. Oturum çerezini yönlendirmeler arasında gönderilecek şekilde ayarla
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
