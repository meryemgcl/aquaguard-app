/* ============================================================
   AquaGuard — Next.js Proxy (Route Protection + RBAC)
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';

type UserRole = 'admin' | 'uzman' | 'yonetici' | 'halk';

const ROLE_ROUTES: Record<UserRole, string[]> = {
  admin:     ['/', '/kanban', '/harita', '/ai-analiz', '/mail-sablonlari', '/kullanicilar', '/ayarlar', '/arsiv'],
  uzman:     ['/', '/kanban', '/harita', '/ai-analiz', '/arsiv'],
  yonetici:  ['/', '/kanban', '/harita', '/ai-analiz', '/mail-sablonlari', '/arsiv'],
  halk:      ['/', '/harita'],
};

const PUBLIC_ROUTES = ['/login', '/register'];

function decodeJWTPayload(token: string): { userId: string; role: UserRole } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(raw));
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* Skip static assets */
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  /* Skip API routes */
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  /* Public routes */
  if (PUBLIC_ROUTES.includes(pathname)) {
    const token = request.cookies.get('token')?.value;
    if (token && decodeJWTPayload(token)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  /* Require auth */
  const token = request.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJWTPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  /* Role-based access */
  const allowed = ROLE_ROUTES[payload.role] ?? [];
  const hasAccess = allowed.some(r => pathname === r || pathname.startsWith(r + '/'));

  if (!hasAccess) {
    const url = new URL('/', request.url);
    url.searchParams.set('access_denied', '1');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
