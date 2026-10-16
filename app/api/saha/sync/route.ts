import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api-auth';
import { applyFieldInspection } from '@/lib/kanban';
import { fieldInspectionSchema } from '@/lib/field-inspection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const syncPayloadSchema = z.object({
  inspections: z.array(fieldInspectionSchema).min(1).max(50),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ['uzman', 'admin', 'super_admin']);
  if (!auth.user) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'İstek gövdesi geçerli JSON değil.' }, { status: 400 });
    }
    throw error;
  }

  const parsed = syncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Saha senkronizasyon verilerini kontrol edin.',
      issues: parsed.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    }, { status: 400 });
  }

  const ids = parsed.data.inspections.map(inspection => inspection.incidentId);
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Bir senkronizasyon paketinde aynı ihbar birden fazla kez bulunamaz.' }, { status: 400 });
  }

  const results = parsed.data.inspections.map(inspection =>
    applyFieldInspection(inspection, { name: auth.user.name, role: 'uzman' }),
  );
  const failureIndex = results.findIndex(result => !result.ok);
  if (failureIndex >= 0) {
    const failed = results[failureIndex];
    const status = failed?.ok === false && failed.reason === 'not_found' ? 404 : 409;
    return NextResponse.json({
      error: status === 404
        ? `Senkronizasyon paketindeki ${ids[failureIndex]} numaralı ihbar bulunamadı.`
        : `Senkronizasyon paketindeki ${ids[failureIndex]} numaralı ihbar artık uzman kuyruğunda değil.`,
      syncedCount: results.slice(0, failureIndex).filter(result => result.ok).length,
      failedIncidentId: ids[failureIndex],
    }, { status });
  }

  return NextResponse.json({ success: true, syncedCount: results.length });
}
