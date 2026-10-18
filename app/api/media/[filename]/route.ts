import { createReadStream, statSync } from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';
import { getMediaAccess } from '@/lib/kanban';
import { getMediaFilePath, isSafeMediaFilename } from '@/lib/media-storage';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function toWebStream(filename: string): ReadableStream<Uint8Array> {
  const iterator = createReadStream(getMediaFilePath(filename))[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!isSafeMediaFilename(filename)) {
    return NextResponse.json({ error: 'Medya dosyası bulunamadı.' }, { status: 404 });
  }

  const access = getMediaAccess(filename);
  if (!access) return NextResponse.json({ error: 'Medya dosyası bulunamadı.' }, { status: 404 });
  if (!access.isPublic) {
    const auth = await requireApiUser(request, STAFF_ROLES);
    if (!auth.user) return auth.response;
  }

  try {
    const filePath = getMediaFilePath(filename);
    const stats = statSync(filePath);
    if (!stats.isFile() || stats.size !== access.media.size) {
      return NextResponse.json({ error: 'Medya dosyası geçersiz.' }, { status: 404 });
    }
    return new NextResponse(toWebStream(filename), {
      headers: {
        'Content-Type': access.media.mimeType,
        'Content-Length': String(stats.size),
        'Cache-Control': access.isPublic ? 'public, max-age=300' : 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    if (isMissingFile(error)) return NextResponse.json({ error: 'Medya dosyası bulunamadı.' }, { status: 404 });
    throw error;
  }
}
