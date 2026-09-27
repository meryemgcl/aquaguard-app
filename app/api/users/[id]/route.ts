import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUser, deleteUser } from '@/lib/users';
import { verifyToken } from '@/lib/auth';
import { UserRole, AccountStatus } from '@/lib/types';
import { sendAccountStatusMail } from '@/lib/email';

const VALID_ROLES: UserRole[] = ['super_admin', 'admin', 'uzman', 'yonetici', 'halk'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Yalnızca yönetici hesapları rol onaylayabilir.' }, { status: 403 });
    }

    const { id } = await params;
    const existingUser = await findUserById(id);
    if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const body = await request.json() as { role?: unknown; accountStatus?: unknown; decision?: unknown };
    const role = body.role;
    const accountStatus = body.accountStatus;
    if (typeof role !== 'string' || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
    }
    if (role === 'super_admin' || (role === 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Bu rolü yalnızca süper yönetici atayabilir.' }, { status: 403 });
    }
    if (accountStatus !== undefined && accountStatus !== 'active') {
      return NextResponse.json({ error: 'Geçersiz hesap durumu.' }, { status: 400 });
    }
    if (body.decision !== undefined && body.decision !== 'approved' && body.decision !== 'rejected') {
      return NextResponse.json({ error: 'Geçersiz başvuru kararı.' }, { status: 400 });
    }
    if (body.decision === 'rejected' && (role !== 'halk' || accountStatus !== 'active')) {
      return NextResponse.json({ error: 'Reddedilen rol başvurusu vatandaş erişimiyle etkin kalmalıdır.' }, { status: 400 });
    }
    if (existingUser.id === payload.userId) {
      return NextResponse.json({ error: 'Kendi hesabınızın rolünü veya durumunu değiştiremezsiniz.' }, { status: 403 });
    }

    const finalRole = role as UserRole;
    const updated = await updateUser(id, {
      role: finalRole,
      accountStatus: 'active' as AccountStatus,
      requestedRole: undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousStatus = existingUser.accountStatus ?? 'active';
    const statusChanged = previousStatus !== updated.accountStatus;
    const roleChanged = existingUser.role !== updated.role;
    const applicationWasPending = previousStatus === 'pending';
    if (statusChanged || roleChanged || body.decision === 'rejected') {
      await sendAccountStatusMail(
        updated.email,
        updated.name,
        body.decision === 'rejected' && applicationWasPending
          ? 'rejected'
          : applicationWasPending ? 'approved' : 'updated',
        updated.role,
      );
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'User update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const success = await deleteUser(id);
    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'User delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
