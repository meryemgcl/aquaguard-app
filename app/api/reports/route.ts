import { NextRequest, NextResponse } from 'next/server';
import { addCard, getCards } from '@/lib/kanban';
import { requireApiUser } from '@/lib/api-auth';
import { incidentSubmissionSchema } from '@/lib/incident-validation';
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from '@/lib/request-json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (!auth.user) return auth.response;

  const cards = getCards();
  return NextResponse.json({
    cards: auth.user.role === 'halk'
      ? cards.filter(card => card.column === 'yayinlandi').map(card => ({ ...card, creatorEmail: '' }))
      : cards,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBodyWithinLimit(req, 28 * 1024 * 1024);
    const parsed = incidentSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'İhbar bilgilerini kontrol edin.',
        issues: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      }, { status: 400 });
    }

    const optionalAuth = parsed.data.privacyLevel === 'acik' && req.cookies.has('token')
      ? await requireApiUser(req, ['halk'])
      : null;
    const citizen = optionalAuth && 'user' in optionalAuth ? optionalAuth.user : undefined;
    const privateSubmission = parsed.data.privacyLevel !== 'acik';
    const card = addCard({
      ...parsed.data,
      creatorEmail: citizen?.email ?? null,
      submittedBy: privateSubmission ? 'Anonim Vatandaş' : parsed.data.reporterName!,
      role: 'halk',
    });

    void import('@/lib/google-sheets-sync').then(({ syncIncidentToGoogleSheets }) => {
      void syncIncidentToGoogleSheets({
        trackingCode: card.trackingCode,
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
        privacyLevel: parsed.data.privacyLevel,
      });
    });

    return NextResponse.json({
      success: true,
      trackingCode: card.trackingCode,
      message: 'İhbarınız yerel kayıt sistemine alındı.',
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'İstek gövdesi geçerli JSON değil.' }, { status: 400 });
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'İstek gövdesi 28 MB sınırını aşıyor.' }, { status: 413 });
    }
    const message = error instanceof Error ? error.message : 'Report creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
