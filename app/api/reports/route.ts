import { NextRequest, NextResponse } from 'next/server';
import { getCards, scoreToLevel } from '@/lib/kanban';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  return NextResponse.json({ cards: getCards() });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json() as { title?: unknown; location?: unknown; description?: unknown; riskLevel?: unknown };
    const { title, location, description, riskLevel } = body;

    if (
      typeof title !== 'string' || !title.trim() ||
      typeof location !== 'string' || !location.trim() ||
      typeof description !== 'string' || !description.trim()
    ) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 });
    }

    const validRiskLevels = ['low', 'medium', 'high', 'critical'] as const;
    const requestedRisk = typeof riskLevel === 'string' && validRiskLevels.includes(riskLevel as typeof validRiskLevels[number])
      ? riskLevel
      : 'medium';
    const riskScores: Record<string, [number, number]> = {
      low: [5, 29], medium: [30, 59], high: [60, 79], critical: [80, 99],
    };
    const [min, max] = riskScores[requestedRisk] || [30, 59];
    const riskScore = Math.floor(Math.random() * (max - min + 1)) + min;
    const level = scoreToLevel(riskScore);

    const { addCard } = await import('@/lib/kanban');
    const card = addCard({
      title: title.trim(),
      location: location.trim(),
      description: description.trim(),
      riskLevel: level,
      riskScore,
      creatorEmail: auth.user.email,
    });

    return NextResponse.json({ success: true, card });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
