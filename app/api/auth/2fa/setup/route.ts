/* ============================================================
   POST /api/auth/2fa/setup
   Generate TOTP secret and QR code for 2FA setup
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/users';
import { generateTwoFactorSecret, generateQRCodeDataUrl } from '@/lib/auth';
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

    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled for this account' },
        { status: 400 }
      );
    }

    // Generate new 2FA secret
    const { secret, qrCode } = generateTwoFactorSecret(user.email);
    
    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrCode);

    return NextResponse.json({
      success: true,
      secret,
      qrCodeDataUrl,
      message: 'Please scan the QR code with your authenticator app and confirm with the code',
    });
  } catch (error: any) {
    console.error('[2FA Setup Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
