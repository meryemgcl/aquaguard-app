/* ============================================================
   POST /api/auth/login
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, toSafeUser, SUPER_ADMIN_SENTINEL } from '@/lib/users';
import { comparePassword, createToken } from '@/lib/auth';

// Basit in-memory Rate Limit (IP bazlı - Vercel ortamında instance başına çalışır)
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

    // Şifre doğrulama: Süper Admin için sentinel kontrolü, normal kullanıcılar için bcrypt
    let isValid = false;
    if (user.passwordHash === SUPER_ADMIN_SENTINEL) {
      // Süper Admin: ENV şifresiyle düz karşılaştır
      isValid = password === (process.env.SUPER_ADMIN_PASSWORD || '');
    } else {
      isValid = await comparePassword(password, user.passwordHash);
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    // Başarılı girişte rate limit sıfırlanır
    rateLimitMap.delete(ip);

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Giriş başarılı!',
      token,
      user: toSafeUser(user),
    });

    // 3. Oturum çerezini güvenli (Strict) yap
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // CSRF koruması için strict yapıldı
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
