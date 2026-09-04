/* ============================================================
   POST /api/auth/2fa/verify
   Verify TOTP token and enable 2FA
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUser } from '@/lib/users';
import { verifyTwoFactorToken, generateBackupCodes, hashBackupCodes } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { secret, code } = await request.json();

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret and code are required' },
        { status: 400 }
      );
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    if (!verifyTwoFactorToken(secret, code)) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // Update user with 2FA enabled
    await updateUser(payload.userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      backupCodes: hashedBackupCodes,
    });

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes, // Only shown once - user must save these
    });
  } catch (error: any) {
    console.error('[2FA Verify Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
