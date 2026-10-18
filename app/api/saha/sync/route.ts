import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api-auth';
import { applyFieldInspection } from '@/lib/kanban';
import { fieldInspectionSchema, type FieldSyncResult } from '@/lib/field-inspection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  items: z.array(z.unknown()).min(1).max(50),
}).strict();

const identitySchema = z.object({
  clientMutationId: z.string().uuid(),
  incidentId: z.string().uuid(),
}).passthrough();

const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

async function readBodyLimited(request: NextRequest): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes).toString('utf8');
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ['uzman', 'admin', 'super_admin']);
  if (!auth.user) return auth.response;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Saha senkronizasyon paketi 32 MB sınırını aşıyor.' }, { status: 413 });
  }

  const bodyText = await readBodyLimited(request);
  if (bodyText === null) {
    return NextResponse.json({ error: 'Saha senkronizasyon paketi 32 MB sınırını aşıyor.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'İstek gövdesi geçerli JSON değil.' }, { status: 400 });
    }
    throw error;
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Saha senkronizasyon paketi biçimi geçersiz.',
      issues: parsed.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    }, { status: 400 });
  }

  const results: FieldSyncResult[] = parsed.data.items.map(rawItem => {
    const identity = identitySchema.safeParse(rawItem);
    if (!identity.success) {
      return {
        clientMutationId: '',
        incidentId: '',
        status: 'REJECTED',
        message: 'Kayıt kimliği geçersiz; bu öğe işlenemedi.',
      };
    }
    const item = fieldInspectionSchema.safeParse(rawItem);
    if (!item.success) {
      return {
        clientMutationId: identity.data.clientMutationId,
        incidentId: identity.data.incidentId,
        status: 'REJECTED',
        message: item.error.issues.map(issue => issue.message).join(' '),
      };
    }
    try {
      const result = applyFieldInspection(item.data, { name: auth.user.name, role: 'uzman' });
      if (result.status === 'SUCCESS' && result.serverIncident) {
        const s = result.serverIncident;
        void import('@/lib/google-sheets-sync').then(({ syncIncidentToGoogleSheets }) => {
          void syncIncidentToGoogleSheets({
            trackingCode: s.trackingCode ?? undefined,
            createdAt: s.updatedAt,
            status: s.column,
            description: s.title,
            measurements: {
              ph: s.measurements?.ph ?? null,
              dissolvedOxygen: s.measurements?.dissolvedO2 ?? null,
              turbidity: s.measurements?.turbidity ?? null,
              temperature: s.measurements?.temperature ?? null,
            },
            expertNotes: s.expertNotes ?? undefined,
          });
        });
      }
      return result;
    } catch (error) {
      console.error('Saha senkronizasyon öğesi işlenemedi.', {
        incidentId: identity.data.incidentId,
        clientMutationId: identity.data.clientMutationId,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
      return {
        clientMutationId: identity.data.clientMutationId,
        incidentId: identity.data.incidentId,
        status: 'REJECTED',
        message: 'Bu saha kaydı işlenemedi; diğer kayıtlar etkilenmedi.',
      };
    }
  });

  return NextResponse.json({ results });
}
