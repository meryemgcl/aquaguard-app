/* ============================================================
   POST /api/kanban/reject — Reddet + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { getCardById, recordApproval } from '@/lib/kanban';
import { requireApiUser } from '@/lib/api-auth';
import { isRecord } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ['yonetici', 'admin', 'super_admin']);
  if (!auth.user) return auth.response;

  try {
    const payload = auth.user;

    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.cardId !== 'string' || !body.cardId ||
        (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 2000))) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi veya cardId.' }, { status: 400 });
    }
    const cardId = body.cardId;
    const reason = body.reason;
    const safeReason = typeof reason === 'string' ? reason.trim() : '';
    if (safeReason.length < 10) {
      return NextResponse.json({ error: 'Kapatma gerekçesi en az 10 karakter olmalıdır.' }, { status: 400 });
    }

    const card = getCardById(cardId);
    if (!card) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });

    const isStaffApprover = payload.role === 'yonetici' || payload.role === 'admin' || payload.role === 'super_admin';
    if (!isStaffApprover || card.column !== 'onay-yonetici') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const updatedCard = recordApproval(cardId, card.column, {
      action: 'rejected',
      role: 'yonetici',
      actorName: payload.name,
      actorInitials: payload.name.substring(0, 2).toUpperCase(),
      actorColor: '#ff4444',
      columnFrom: card.column,
      columnTo: 'reddedildi',
      resolution: 'kapatildi',
      reason: safeReason,
    });
    if (!updatedCard) return NextResponse.json({ error: 'Rapor eşzamanlı olarak değişti; yenileyip tekrar deneyin.' }, { status: 409 });

    void import('@/lib/google-sheets-sync').then(({ syncIncidentToGoogleSheets }) => {
      void syncIncidentToGoogleSheets({
        trackingCode: updatedCard.trackingCode ?? undefined,
        createdAt: updatedCard.createdAt,
        province: updatedCard.province ?? undefined,
        district: updatedCard.district ?? undefined,
        category: updatedCard.incidentCategory,
        riskLevel: updatedCard.riskLevel,
        status: updatedCard.column,
        description: updatedCard.description,
        waterbodyName: updatedCard.location,
        measurements: {
          ph: updatedCard.measurements?.ph ?? null,
          dissolvedOxygen: updatedCard.measurements?.dissolvedO2 ?? null,
          turbidity: updatedCard.measurements?.turbidity ?? null,
          temperature: updatedCard.measurements?.temperature ?? null,
        },
        expertNotes: updatedCard.expertNotes ?? undefined,
        privacyLevel: updatedCard.privacyLevel,
      });
    });

    return NextResponse.json({ success: true, message: 'İhbar kapatıldı.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sunucu hatası';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
