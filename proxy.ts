import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PAGES = ['/login', '/register'];
const KNOWN_ROLES = ['super_admin', 'admin', 'uzman', 'yonetici', 'halk'];
const STAFF_ROLES = ['super_admin', 'admin', 'uzman', 'yonetici'];

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET ortam değişkeni tanımlı ve en az 32 karakter olmalıdır.');
  }
  return new TextEncoder().encode(secret);
}

function rolesForApi(pathname: string, method: string): string[] | null {
  if (pathname === '/api/dashboard' || pathname === '/api/kanban') return STAFF_ROLES;
  if (pathname === '/api/reports' && method === 'GET') return STAFF_ROLES;
  if (pathname.startsWith('/api/kanban/approve') || pathname.startsWith('/api/kanban/reject')) return STAFF_ROLES;
  if (pathname.startsWith('/api/v2/ai/')) return STAFF_ROLES;
  if (pathname.startsWith('/api/mail/')) return ['super_admin', 'admin', 'yonetici'];
  if (pathname === '/api/users') return ['super_admin', 'admin'];
  if (pathname.startsWith('/api/users/')) {
    return ['super_admin', 'admin'];
  }
  return null;
}

function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const token = request.cookies.get('token')?.value;

  if (isApi) {
    if (
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/register' ||
      pathname === '/api/cron/daily-report' ||
      (pathname === '/api/auth/me' && request.method === 'POST')
    ) {
      return NextResponse.next();
    }

    if (!token) return apiError('Oturum gerekli.', 401);

    let payload;
    try {
      ({ payload } = await jwtVerify(token, getSecret()));
    } catch {
      return apiError('Geçersiz oturum.', 401);
    }

    if (
      typeof payload.userId !== 'string' ||
      !payload.userId ||
      typeof payload.email !== 'string' ||
      !payload.email ||
      typeof payload.name !== 'string' ||
      !payload.name ||
      typeof payload.role !== 'string' ||
      !KNOWN_ROLES.includes(payload.role)
    ) {
      return apiError('Geçersiz oturum.', 401);
    }

    if (payload.twoFactorChallenge === true && pathname !== '/api/auth/2fa/challenge') {
      return apiError('İki aşamalı doğrulama tamamlanmalı.', 403);
    }

    const allowedRoles = rolesForApi(pathname, request.method);
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return apiError('Bu işlem için yetkiniz yok.', 403);
    }

    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  let isValidUser = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      isValidUser =
        typeof payload.userId === 'string' &&
        payload.userId.length > 0 &&
        typeof payload.role === 'string' &&
        KNOWN_ROLES.includes(payload.role) &&
        payload.twoFactorChallenge !== true;
    } catch {
      isValidUser = false;
    }
  }

  if (isValidUser && isPublicPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isValidUser && !isPublicPage) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
