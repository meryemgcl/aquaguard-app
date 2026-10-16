import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/users';
import { requireApiUser } from '@/lib/api-auth';
import { USER_ADMIN_ROLES } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request, USER_ADMIN_ROLES);
    if (!auth.user) return auth.response;

    const users = await getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Users fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
