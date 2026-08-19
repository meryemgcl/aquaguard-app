import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Define public and protected routes
const PUBLIC_ROUTES = ['/login', '/register'];

// We need to use `jose` inside middleware because it's Edge compatible
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'aquaguard-super-secret-key-2026');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip API routes, static files, and Next.js internal paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  let isValidUser = false;

  if (token) {
    try {
      await jwtVerify(token, getSecret());
      isValidUser = true;
    } catch {
      isValidUser = false;
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // If the user is authenticated and tries to access login/register, redirect to dashboard
  if (isValidUser && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If the user is not authenticated and tries to access a protected route, redirect to login
  if (!isValidUser && !isPublicRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
