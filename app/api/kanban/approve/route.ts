/* ============================================================
   POST /api/kanban/approve — Onayla + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCard, advanceCard, APPROVAL_ROLES } from '@/lib/kanban';
import { sendExpertApprovalMail, sendManagerApprovalMail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });

    const { cardId, draftEmail } = await request.json();
    if (!cardId) return NextResponse.json({ error: 'cardId gerekli.' }, { status: 400 });

    const card = getCard(cardId);
    if (!card) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });

    const allowedRoles = APPROVAL_ROLES[card.column];
    if (!allowedRoles || !allowedRoles.includes(payload.role as any)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const updatedCard = advanceCard(cardId, {
      actorId: payload.userId,
      actorName: payload.name,
      actorRole: payload.role as any,
      action: 'approved',
    });

    if (!updatedCard) return NextResponse.json({ error: 'Kart güncellenemedi.' }, { status: 500 });

    // ── Mail bildirimleri ──────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const yoneticiEmail = process.env.YONETICI_EMAIL || '';

    if (payload.role === 'uzman') {
      // Uzman onayladı → Admin ve Yöneticiye bildir
      sendExpertApprovalMail(adminEmail, card.title, card.location, payload.name).catch(console.error);
      if (yoneticiEmail && yoneticiEmail !== adminEmail) {
        sendExpertApprovalMail(yoneticiEmail, card.title, card.location, payload.name).catch(console.error);
      }
    } else if (payload.role === 'yonetici' || payload.role === 'admin') {
      // Son onay → Raporun oluşturucusuna + Admin'e bildir
      const draft = draftEmail || `${card.title} raporu onaylanmıştır.`;
      sendManagerApprovalMail(adminEmail, card.title, card.location, payload.name, draft).catch(console.error);
      if (card.creatorEmail && card.creatorEmail !== adminEmail) {
        sendManagerApprovalMail(card.creatorEmail, card.title, card.location, payload.name, draft).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, card: updatedCard, message: `Onaylandı. İlgili taraflara e-posta gönderildi.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
