import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { acknowledgeStationAlert } from '@/lib/measurements';
import { isRecord } from '@/lib/validation';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
  }
  if (!isRecord(body) || body.action !== 'acknowledge') {
    return NextResponse.json({ error: 'Desteklenmeyen uyarı işlemi.' }, { status: 400 });
  }
  const { id } = await params;
  const alert = acknowledgeStationAlert(id, auth.user.email);
  if (!alert) {
    return NextResponse.json({ error: 'Açık uyarı bulunamadı veya daha önce ele alınmış.' }, { status: 409 });
  }
  return NextResponse.json({ alert });
}
