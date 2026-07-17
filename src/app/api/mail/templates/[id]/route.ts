/* GET  /api/mail/templates/[id] — get one template
   PUT  /api/mail/templates/[id] — update subject/html
   POST /api/mail/templates/[id]/preview — render preview */
import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, updateTemplate, renderTemplate, TemplateId } from '@/lib/mailTemplates';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = getTemplate(id as TemplateId);
  if (!template) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 });
  return NextResponse.json({ success: true, template });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = updateTemplate(id as TemplateId, {
    subject: body.subject,
    html: body.html,
  });
  if (!updated) return NextResponse.json({ success: false, message: 'Template not found.' }, { status: 404 });
  return NextResponse.json({ success: true, template: updated });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = getTemplate(id as TemplateId);
  if (!template) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 });

  const body = await request.json();
  const previewTemplate = { ...template, ...body };

  const sampleVars: Record<string, string> = {
    title: template.name,
    adminName: 'Mehmet Demir',
    reportTitle: 'Sapanca Gölü Oksijen Eksikliği',
    reportId: 'CARD0002',
    location: 'Sakarya, TR',
    riskScore: '85',
    riskLevel: 'Kritik',
    riskColor: '#ff4444',
    actorName: 'Ayşe Yılmaz',
    expertName: 'Ayşe Yılmaz',
    managerName: 'Mehmet Demir',
    reason: 'Ölçüm istasyonlarının coğrafi dağılımı yetersiz. En az 8 noktadan veri alınmalıdır.',
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    loginUrl: 'http://localhost:3000',
    editUrl: 'http://localhost:3000/kanban',
  };

  const rendered = renderTemplate(previewTemplate, sampleVars);
  return NextResponse.json({ success: true, ...rendered });
}
