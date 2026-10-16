import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { listMeasurements } from '@/lib/measurements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function csvCell(value: string | number): string {
  const raw = String(value);
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;
  const params = request.nextUrl.searchParams;
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  if (
    (from && !Number.isFinite(Date.parse(from))) ||
    (to && !Number.isFinite(Date.parse(to))) ||
    (from && to && Date.parse(from) > Date.parse(to))
  ) {
    return NextResponse.json({ error: 'Geçerli bir zaman aralığı belirtin.' }, { status: 400 });
  }
  if (from && to && Date.parse(to) - Date.parse(from) > 366 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Dışa aktarma aralığı en fazla 366 gün olabilir.' }, { status: 400 });
  }

  const measurements = listMeasurements({
    stationId: params.get('stationId') ?? undefined,
    parameter: params.get('parameter') ?? undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
    limit: 10001,
  });
  if (measurements.length > 10000) {
    return NextResponse.json({
      error: 'Dışa aktarma 10.000 ölçümle sınırlıdır; tarih aralığını veya filtreleri daraltın.',
    }, { status: 413 });
  }
  const header = [
    'station_id', 'station_name', 'parameter', 'value', 'unit', 'measured_at', 'source',
    'quality_flag', 'calibration_status', 'source_record_id',
  ];
  const rows = measurements.map(item => [
    item.stationId, item.stationName ?? '', item.parameter, item.value, item.unit, item.measuredAt,
    item.source, item.qualityFlag, item.calibrationStatus, item.sourceRecordId,
  ]);
  const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="aquaguard-measurements.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
