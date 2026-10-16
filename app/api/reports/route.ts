import { NextRequest, NextResponse } from 'next/server';
import { addCard, getCards } from '@/lib/kanban';
import { requireApiUser } from '@/lib/api-auth';
import { incidentSubmissionSchema } from '@/lib/incident-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (!auth.user) return auth.response;

  const cards = getCards();
  return NextResponse.json({
    cards: auth.user.role === 'halk'
      ? cards.filter(card => card.column === 'yayinlandi')
      : cards,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.user) return auth.response;

  try {
    const body: unknown = await req.json();
    const parsed = incidentSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'İhbar bilgilerini kontrol edin.',
        issues: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      }, { status: 400 });
    }

    const card = addCard({
      ...parsed.data,
      creatorEmail: auth.user.email,
      submittedBy: auth.user.name,
      role: auth.user.role,
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
    const message = error instanceof Error ? error.message : 'Report creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
