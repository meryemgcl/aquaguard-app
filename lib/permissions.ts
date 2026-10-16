import { ROLE_ROUTES, type UserRole } from '@/lib/types';

export const STAFF_ROLES: readonly UserRole[] = [
  'super_admin',
  'admin',
  'uzman',
  'yonetici',
];

export const USER_ADMIN_ROLES: readonly UserRole[] = ['super_admin', 'admin'];
export const SYSTEM_ADMIN_ROLES: readonly UserRole[] = ['super_admin'];

export function getApiAllowedRoles(pathname: string): readonly UserRole[] | null {
  if (pathname === '/api/kanban') return STAFF_ROLES;
  if (pathname === '/api/saha/queue' || pathname === '/api/saha/sync') return ['super_admin', 'admin', 'uzman'];
  if (pathname.startsWith('/api/kanban/review')) return ['uzman'];
  if (pathname.startsWith('/api/kanban/approve') || pathname.startsWith('/api/kanban/reject')) return STAFF_ROLES;
  if (pathname.startsWith('/api/v2/ai/')) return STAFF_ROLES;
  if (pathname === '/api/users' || pathname.startsWith('/api/users/')) return USER_ADMIN_ROLES;
  return null;
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  return ROLE_ROUTES[role].some(route =>
    route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function canManageTargetRole(
  actorRole: UserRole,
  targetRole: UserRole,
  nextRole?: UserRole,
): boolean {
  if (targetRole === 'super_admin' || nextRole === 'super_admin') return false;
  if (actorRole === 'super_admin') return true;
  if (actorRole !== 'admin') return false;
  return targetRole !== 'admin' && (nextRole === undefined || nextRole !== 'admin');
}
