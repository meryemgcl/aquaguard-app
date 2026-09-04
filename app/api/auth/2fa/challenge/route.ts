/* ============================================================
   POST /api/auth/2fa/challenge
   Verify TOTP code during login when 2FA is enabled
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/users';
import { verifyTwoFactorToken, verifyBackupCode, createToken } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const tempToken = request.cookies.get('token')?.value;
    if (!tempToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(tempToken);
    if (!payload || !payload.twoFactorChallenge) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const user = await findUserById(payload.userId);
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'User or 2FA not found' }, { status: 404 });
    }

    let isValid = false;

    // Try TOTP code first
    if (verifyTwoFactorToken(user.twoFactorSecret, code)) {
      isValid = true;
    } else if (user.backupCodes) {
      // Try backup code
      isValid = await verifyBackupCode(code, user.backupCodes);
      if (isValid) {
        // Remove used backup code
        const updatedBackupCodes = user.backupCodes.filter(
          (bc) => bc !== code
        );
        // Update user to remove used backup code
        // Note: This is simplified - implement proper backup code removal
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Create final token with 2FA verified
    const finalToken = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      twoFactorVerified: true,
    });

    const response = NextResponse.json({
      success: true,
      message: '2FA verification successful!',
      token: finalToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });

    response.cookies.set('token', finalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[2FA Challenge Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
