import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUser, deleteUser } from '@/lib/users';
import { UserRole } from '@/lib/types';
import { sendAccountStatusMail } from '@/lib/email';
import { requireApiUser } from '@/lib/api-auth';
import { canManageTargetRole, USER_ADMIN_ROLES } from '@/lib/permissions';
import { isRecord } from '@/lib/validation';

const VALID_ROLES: UserRole[] = ['super_admin', 'admin', 'uzman', 'yonetici', 'halk'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiUser(request, USER_ADMIN_ROLES);
    if (!auth.user) return auth.response;
    const actor = auth.user;

    const { id } = await params;
    const existingUser = await findUserById(id);
    if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
    }
    const role = body.role;
    const accountStatus = body.accountStatus;
    if (typeof role !== 'string' || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
    }
    if (!canManageTargetRole(actor.role, existingUser.role, role as UserRole)) {
      return NextResponse.json({ error: 'Bu kullanıcı veya rol için yetkiniz yok.' }, { status: 403 });
    }
    if (accountStatus !== undefined && accountStatus !== 'active') {
      return NextResponse.json({ error: 'Geçersiz hesap durumu.' }, { status: 400 });
    }
    if (body.decision !== undefined && body.decision !== 'approved' && body.decision !== 'rejected') {
      return NextResponse.json({ error: 'Geçersiz başvuru kararı.' }, { status: 400 });
    }
    const previousStatus = existingUser.accountStatus ?? 'active';
    if (body.decision !== undefined && previousStatus !== 'pending') {
      return NextResponse.json({ error: 'Yalnızca bekleyen rol başvuruları karara bağlanabilir.' }, { status: 409 });
    }
    if (previousStatus === 'pending' && body.decision === undefined) {
      return NextResponse.json({ error: 'Bekleyen rol başvurusu için onay veya ret kararı gereklidir.' }, { status: 400 });
    }
    if (body.decision === 'approved' && role !== existingUser.requestedRole) {
      return NextResponse.json({ error: 'Başvuru yalnızca istenen rolle onaylanabilir.' }, { status: 400 });
    }
    if (body.decision === 'rejected' && (role !== 'halk' || accountStatus !== 'active')) {
      return NextResponse.json({ error: 'Reddedilen rol başvurusu vatandaş erişimiyle etkin kalmalıdır.' }, { status: 400 });
    }
    if (existingUser.id === actor.userId) {
      return NextResponse.json({ error: 'Kendi hesabınızın rolünü veya durumunu değiştiremezsiniz.' }, { status: 403 });
    }

    const finalRole = role as UserRole;
    const updated = await updateUser(id, {
      role: finalRole,
      accountStatus: 'active',
      requestedRole: undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
    const auth = await requireApiUser(request, USER_ADMIN_ROLES);
    if (!auth.user) return auth.response;

    const { id } = await params;
    const existingUser = await findUserById(id);
    if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!canManageTargetRole(auth.user.role, existingUser.role) || existingUser.id === auth.user.userId) {
      return NextResponse.json({ error: 'Bu kullanıcıyı silmek için yetkiniz yok.' }, { status: 403 });
    }

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
