import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { startExpertReview, updateExpertReview } from '@/lib/kanban';
import { requireApiUser } from '@/lib/api-auth';

export const runtime = 'nodejs';

const measurementsSchema = z.object({
  ph: z.number().min(0).max(14).optional(),
  turbidity: z.number().min(0).max(100000).optional(),
  dissolvedO2: z.number().min(0).max(100).optional(),
  temperature: z.number().min(-5).max(100).optional(),
}).strict();

const startSchema = z.object({
  action: z.literal('start'),
  cardId: z.string().min(1).max(100),
});

const reviewSchema = z.object({
  action: z.enum(['save', 'forward', 'invalid']),
  cardId: z.string().min(1).max(100),
  riskScore: z.number().int().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  acceptedAiSuggestion: z.boolean(),
  measurements: measurementsSchema,
  note: z.string().trim().max(2000),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ['super_admin', 'admin', 'uzman']);
  if (!auth.user) return auth.response;

  try {
    const body: unknown = await request.json();
    const start = startSchema.safeParse(body);
    if (start.success) {
      const card = startExpertReview(start.data.cardId, { name: auth.user.name, role: auth.user.role });
      if (!card) return NextResponse.json({ error: 'İhbar artık yeni değil veya başka bir uzman başlattı.' }, { status: 409 });
      return NextResponse.json({ success: true });
    }

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Uzman değerlendirme bilgilerini kontrol edin.',
        issues: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      }, { status: 400 });
    }
    if (parsed.data.action === 'invalid' && parsed.data.note.length < 10) {
      return NextResponse.json({ error: 'Geçersiz ihbar gerekçesi en az 10 karakter olmalıdır.' }, { status: 400 });
    }

    const card = updateExpertReview(
      parsed.data.cardId,
      {
        action: parsed.data.action,
        riskScore: parsed.data.riskScore,
        riskLevel: parsed.data.riskLevel,
        acceptedAiSuggestion: parsed.data.acceptedAiSuggestion,
        measurements: parsed.data.measurements,
        note: parsed.data.note,
      },
      { name: auth.user.name, role: auth.user.role },
    );
    if (!card) return NextResponse.json({ error: 'İhbar uzman incelemesinde değil veya eşzamanlı olarak değişti.' }, { status: 409 });

    void import('@/lib/google-sheets-sync').then(({ syncIncidentToGoogleSheets }) => {
      void syncIncidentToGoogleSheets({
        trackingCode: card.trackingCode ?? undefined,
        createdAt: card.createdAt,
        province: card.province ?? undefined,
        district: card.district ?? undefined,
        category: card.incidentCategory,
        riskLevel: card.riskLevel,
        status: card.column,
        description: card.description,
        waterbodyName: card.location,
        measurements: {
          ph: card.measurements?.ph ?? null,
          dissolvedOxygen: card.measurements?.dissolvedO2 ?? null,
          turbidity: card.measurements?.turbidity ?? null,
          temperature: card.measurements?.temperature ?? null,
        },
        expertNotes: card.expertNotes ?? undefined,
        privacyLevel: card.privacyLevel,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'İstek gövdesi geçerli JSON değil.' }, { status: 400 });
    }
    console.error('Expert review request failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Uzman değerlendirmesi kaydedilemedi.' }, { status: 500 });
  }
}
