/* ============================================================
   AquaGuard — Mail Templates Store
   6 editable templates with {{variable}} interpolation
   ============================================================ */

export type TemplateId =
  | 'new-report'
  | 'ai-complete'
  | 'first-approval'
  | 'first-rejection'
  | 'published'
  | 'final-rejection';

export interface MailTemplate {
  id: TemplateId;
  name: string;
  trigger: string;
  description: string;
  accentColor: string;
  accentLabel: string;
  subject: string;
  html: string;
  variables: string[];
  lastEditedAt: string;
}

/* ── Reusable HTML base (header + footer wrapper) ── */
export const baseHtmlOpen = (accentColor: string, badgeText: string, title: string) => `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0f1e;color:#c8d0e0;}
  .wrap{max-width:600px;margin:0 auto;background:#0d1428;}
  .hdr{padding:32px 32px 28px;background:linear-gradient(135deg,#0d1428 0%,#111c38 100%);border-bottom:2px solid ${accentColor};}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
  .logo-drop{width:28px;height:28px;background:linear-gradient(135deg,#00d4ff,#6e8efb);border-radius:50% 50% 50% 15%;transform:rotate(-20deg);}
  .logo-text{font-size:18px;font-weight:700;color:#00d4ff;letter-spacing:-0.02em;}
  .badge{display:inline-block;padding:4px 14px;background:${accentColor}18;border:1px solid ${accentColor}55;border-radius:20px;color:${accentColor};font-size:11px;font-weight:700;letter-spacing:.06em;margin-bottom:14px;text-transform:uppercase;}
  .hdr h1{font-size:20px;color:#f0f4ff;line-height:1.3;}
  .body{padding:28px 32px;background:#111827;}
  p{line-height:1.7;margin-bottom:14px;font-size:14px;}
  strong{color:#f0f4ff;}
  .box{border-radius:10px;padding:16px 20px;margin:18px 0;font-size:14px;line-height:1.65;}
  .box-red{background:rgba(255,68,68,.07);border:1px solid rgba(255,68,68,.22);border-left:3px solid #ff4444;}
  .box-green{background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.2);border-left:3px solid #00ff88;}
  .box-blue{background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.2);border-left:3px solid #00d4ff;}
  .box-amber{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-left:3px solid #f59e0b;}
  .box-label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;}
  .box-red .box-label{color:#ff6b6b;}
  .box-green .box-label{color:#00ff88;}
  .box-blue .box-label{color:#00d4ff;}
  .box-amber .box-label{color:#f59e0b;}
  .grid{display:table;width:100%;border-collapse:separate;border-spacing:10px;margin:16px 0;}
  .grid-row{display:table-row;}
  .grid-cell{display:table-cell;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:12px;width:50%;vertical-align:top;}
  .cell-label{font-size:10px;color:#8892a8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}
  .cell-value{font-size:13px;color:#f0f4ff;font-weight:500;}
  .cta{display:block;text-align:center;padding:14px 28px;background:linear-gradient(135deg,#00b4d8,#00d4ff);color:#0a0f1e;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin:24px 0;}
  .cta-red{background:linear-gradient(135deg,#cc2222,#ff4444)!important;color:#fff!important;}
  .divider{height:1px;background:rgba(255,255,255,.06);margin:20px 0;}
  .muted{font-size:12px;color:#8892a8;}
  .ftr{padding:20px 32px;background:#0a0f1e;border-top:1px solid rgba(255,255,255,.05);text-align:center;font-size:11px;color:#555f75;}
  .ftr a{color:#00d4ff;text-decoration:none;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="logo">
      <div class="logo-drop"></div>
      <span class="logo-text">AquaGuard</span>
    </div>
    <div class="badge">${badgeText}</div>
    <h1>${title}</h1>
  </div>
  <div class="body">`;

export const baseHtmlClose = `
    <p class="muted">Bu e-posta AquaGuard platformu tarafından otomatik olarak oluşturulmuştur. Lütfen bu iletiye yanıt vermeyiniz.</p>
  </div>
  <div class="ftr">
    AquaGuard Su Kalitesi İzleme Platformu &nbsp;·&nbsp; <a href="#">Ayarlar</a> &nbsp;·&nbsp; <a href="#">Abonelikten Çık</a>
  </div>
</div>
</body>
</html>`;

/* ── Template definitions ── */
const templateStore: Record<TemplateId, MailTemplate> = {
  'new-report': {
    id: 'new-report',
    name: 'Yeni Rapor Bildirimi',
    trigger: 'Kart "Yeni Rapor" kolonuna eklendiğinde',
    description: 'Admin kullanıcısına yeni rapor geldiğini bildirir.',
    accentColor: '#8892a8',
    accentLabel: '📋 YENİ RAPOR',
    subject: '[AquaGuard] Yeni Rapor Alındı: {{reportTitle}}',
    html: `{{BASE_OPEN}}
    <p>Merhaba <strong>{{adminName}}</strong>,</p>
    <p>Platforma yeni bir su kalitesi raporu iletildi. Raporun AI analiz sürecine alınması için lütfen inceleyin.</p>
    <div class="box box-blue">
      <div class="box-label">📋 Rapor Detayları</div>
      <p style="margin:0"><strong>{{reportTitle}}</strong><br>
      📍 {{location}} &nbsp;·&nbsp; Risk Skoru: <strong style="color:{{riskColor}}">{{riskScore}} ({{riskLevel}})</strong></p>
    </div>
    <div class="grid">
      <div class="grid-row">
        <div class="grid-cell"><div class="cell-label">Rapor ID</div><div class="cell-value">#{{reportId}}</div></div>
        <div class="grid-cell"><div class="cell-label">Tarih</div><div class="cell-value">{{date}}</div></div>
      </div>
    </div>
    <a href="{{loginUrl}}" class="cta">→ Raporu İncele</a>
{{BASE_CLOSE}}`,
    variables: ['adminName', 'reportTitle', 'location', 'riskScore', 'riskLevel', 'riskColor', 'reportId', 'date', 'loginUrl'],
    lastEditedAt: '2026-07-17T00:00:00Z',
  },

  'ai-complete': {
    id: 'ai-complete',
    name: 'AI Analiz Tamamlandı',
    trigger: 'Kart "AI Analiz" → "1. Onay" kolonuna geçtiğinde',
    description: 'Rapor sahibine AI analizinin tamamlandığını bildirir.',
    accentColor: '#6e8efb',
    accentLabel: '🤖 AI ANALİZ TAMAMLANDI',
    subject: '[AquaGuard] AI Analiz Tamamlandı: {{reportTitle}}',
    html: `{{BASE_OPEN}}
    <p>Merhaba,</p>
    <p><strong>{{reportTitle}}</strong> başlıklı raporunuz AquaGuard Yapay Zeka motoru tarafından başarıyla analiz edildi.</p>
    <div class="box box-blue">
      <div class="box-label">🤖 AI Analiz Sonucu</div>
      <p style="margin:0">Tespit edilen risk seviyesi: <strong style="color:{{riskColor}}">{{riskLevel}} ({{riskScore}}/100)</strong><br>
      Rapor şu anda <strong>1. Onay (Uzman)</strong> aşamasında değerlendirme bekliyor.</p>
    </div>
    <a href="{{loginUrl}}" class="cta">→ Analiz Sonuçlarını Görüntüle</a>
{{BASE_CLOSE}}`,
    variables: ['reportTitle', 'riskScore', 'riskLevel', 'riskColor', 'loginUrl'],
    lastEditedAt: '2026-07-17T00:00:00Z',
  },

  'first-approval': {
    id: 'first-approval',
    name: '1. Onay Verildi — Yöneticiye Bildirim',
    trigger: 'Uzman onayladığında → yönetici e-posta alır',
    description: 'Yöneticiye "onayınız bekleniyor" bildirimi gönderir.',
    accentColor: '#f59e0b',
    accentLabel: '✅ YÖNETİCİ ONAYI BEKLENİYOR',
    subject: '[AquaGuard] Onayınız Bekleniyor: {{reportTitle}}',
    html: `{{BASE_OPEN}}
    <p>Merhaba <strong>{{adminName}}</strong>,</p>
    <p><strong>{{reportTitle}}</strong> başlıklı rapor, Uzman <strong>{{actorName}}</strong> tarafından incelenerek onaylandı ve şimdi <strong>2. Onay (Yönetici)</strong> aşamasında sizin değerlendirmenizi bekliyor.</p>
    <div class="box box-amber">
      <div class="box-label">⏳ Bekleyen İşlem</div>
      <p style="margin:0">Rapor: <strong>{{reportTitle}}</strong><br>
      Uzman Onayı: <strong>{{actorName}}</strong> &nbsp;·&nbsp; {{date}}</p>
    </div>
    <a href="{{loginUrl}}" class="cta">→ Raporu İncele ve Onayla</a>
{{BASE_CLOSE}}`,
    variables: ['adminName', 'reportTitle', 'actorName', 'date', 'loginUrl'],
    lastEditedAt: '2026-07-17T00:00:00Z',
  },

  'first-rejection': {
    id: 'first-rejection',
    name: '1. Red — Düzeltme Daveti',
    trigger: 'Uzman reddederse → rapor sahibine düzeltme daveti',
    description: 'Red sebebini içeren düzeltme davetini rapor sahibine gönderir.',
    accentColor: '#ff4444',
    accentLabel: '❌ RAPOR REDDEDİLDİ — DÜZELTME GEREKLİ',
    subject: '[AquaGuard] Raporunuz Düzeltme Gerektiriyor: {{reportTitle}}',
    html: `{{BASE_OPEN}}
    <p>Merhaba,</p>
    <p>Gönderdiğiniz <strong>{{reportTitle}}</strong> başlıklı rapor, Uzman <strong>{{actorName}}</strong> tarafından incelenerek aşağıdaki gerekçeyle reddedilmiştir.</p>
    <div class="box box-red">
      <div class="box-label">🔴 Red Gerekçesi</div>
      <p style="margin:0;color:#e8eeff;">{{reason}}</p>
    </div>
    <div class="grid">
      <div class="grid-row">
        <div class="grid-cell"><div class="cell-label">Rapor ID</div><div class="cell-value">#{{reportId}}</div></div>
        <div class="grid-cell"><div class="cell-label">İşlem Tarihi</div><div class="cell-value">{{date}}</div></div>
        <div class="grid-cell"><div class="cell-label">Değerlendiren</div><div class="cell-value">{{actorName}}</div></div>
        <div class="grid-cell"><div class="cell-label">Aşama</div><div class="cell-value">1. Onay (Uzman)</div></div>
      </div>
    </div>
    <p>Lütfen yukarıdaki gerekçeyi dikkate alarak raporunuzu düzeltin ve yeniden gönderin.</p>
    <a href="{{editUrl}}" class="cta cta-red">→ Raporu Düzenle ve Yeniden Gönder</a>
{{BASE_CLOSE}}`,
    variables: ['reportTitle', 'actorName', 'reason', 'reportId', 'date', 'editUrl'],
    lastEditedAt: '2026-07-17T00:00:00Z',
  },

  'published': {
    id: 'published',
    name: 'Rapor Yayınlandı',
    trigger: 'Yönetici onayladığında → rapor sahibine yayın bildirimi',
    description: 'Raporun yayınlandığını rapor sahibine kutlayıcı şekilde bildirir.',
    accentColor: '#00ff88',
    accentLabel: '🌊 RAPOR YAYINLANDI',
    subject: '[AquaGuard] 🎉 Raporunuz Yayınlandı: {{reportTitle}}',
    html: `{{BASE_OPEN}}
    <p>Merhaba, harika haber!</p>
    <p><strong>{{reportTitle}}</strong> başlıklı raporunuz tüm onay aşamalarını başarıyla geçerek AquaGuard platformunda <strong>yayınlandı</strong>. 🎉</p>
    <div class="box box-green">
      <div class="box-label">✅ Onay Zinciri Tamamlandı</div>
      <p style="margin:0;color:#e8eeff;">
        🔬 Uzman Onayı: <strong>{{expertName}}</strong><br>
        ✅ Yönetici Onayı: <strong>{{actorName}}</strong><br>
        📅 Yayın Tarihi: <strong>{{date}}</strong>
      </p>
    </div>
    <p>Raporunuz artık halk kullanıcıları dahil tüm platform üyelerine açıktır. Katkınız için teşekkür ederiz!</p>
    <a href="{{loginUrl}}" class="cta">→ Yayınlanan Raporu Görüntüle</a>
{{BASE_CLOSE}}`,
    variables: ['reportTitle', 'expertName', 'actorName', 'date', 'loginUrl'],
    lastEditedAt: '2026-07-17T00:00:00Z',
  },

  'final-rejection': {
    id: 'final-rejection',
    name: '2. Red — Nihai Red Bildirimi',
    trigger: 'Yönetici reddederse → rapor sahibine nihai red',
    description: 'Yönetici tarafından yapılan nihai reddi detaylıca bildirir.',
    accentColor: '#ff4444',
    accentLabel: '❌ YÖNETİCİ TARAFINDAN REDDEDİLDİ',
    subject: '[AquaGuard] Nihai Red Kararı: {{reportTitle}}',
    html: `{{BASE_OPEN}}
    <p>Merhaba,</p>
    <p><strong>{{reportTitle}}</strong> başlıklı raporunuz, Yönetici <strong>{{actorName}}</strong> tarafından yapılan nihai değerlendirme sonucunda reddedilmiştir.</p>
    <div class="box box-red">
      <div class="box-label">🔴 Nihai Red Gerekçesi</div>
      <p style="margin:0;color:#e8eeff;">{{reason}}</p>
    </div>
    <p>Bu karar nihai nitelikte olup raporunuz tekrar onay sürecine girmeyecektir. Daha fazla bilgi için lütfen platform üzerinden yöneticinizle iletişime geçiniz.</p>
    <div class="divider"></div>
    <p class="muted">Rapor: #{{reportId}} &nbsp;·&nbsp; Karar Tarihi: {{date}}</p>
{{BASE_CLOSE}}`,
    variables: ['reportTitle', 'actorName', 'reason', 'reportId', 'date'],
    lastEditedAt: '2026-07-17T00:00:00Z',
  },
};

/* ── CRUD ── */
export function getAllTemplates(): MailTemplate[] {
  return Object.values(templateStore);
}

export function getTemplate(id: TemplateId): MailTemplate | undefined {
  return templateStore[id];
}

export function updateTemplate(
  id: TemplateId,
  patch: Partial<Pick<MailTemplate, 'subject' | 'html'>>
): MailTemplate | null {
  if (!templateStore[id]) return null;
  templateStore[id] = {
    ...templateStore[id],
    ...patch,
    lastEditedAt: new Date().toISOString(),
  };
  return templateStore[id];
}

/* ── Variable interpolation ── */
export function renderTemplate(
  template: Pick<MailTemplate, 'subject' | 'html' | 'accentColor' | 'accentLabel'>,
  vars: Record<string, string>
): { subject: string; html: string } {
  const open = baseHtmlOpen(template.accentColor, template.accentLabel, vars['title'] ?? 'AquaGuard Bildirimi');
  const close = baseHtmlClose;

  let html = template.html
    .replace('{{BASE_OPEN}}', open)
    .replace('{{BASE_CLOSE}}', close);

  let subject = template.subject;

  for (const [key, value] of Object.entries(vars)) {
    const rx = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(rx, value);
    subject = subject.replace(rx, value);
  }

  return { subject, html };
}
