/* eslint-disable @typescript-eslint/no-require-imports */
const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'aquaguard.db');
const db = new BetterSqlite3(dbPath);

const now = new Date('2026-09-28T12:00:00.000Z').toISOString();

const reports = [
  {
    id: 'rep-01',
    title: 'Evsel Atık Su ve Kanalizasyon Sızıntısı Bildirimi',
    location: 'İzmir, Bornova, Kemalpaşa Caddesi üzeri dere kenarı',
    province: 'İzmir',
    district: 'Bornova',
    latitude: 38.461,
    longitude: 27.218,
    category: 'waste',
    incident_category: 'evsel atık',
    tracking_code: 'AG-2026-N1GN0',
    reporter_name: 'Zeynep Çubuk',
    reporter_email: 'betuldadas82@gmail.com',
    privacy_level: 'acik',
    description: 'Bornova Deresi kenarında yoğun kanalizasyon kokusu ve atık su sızıntısı gözlemlendi.',
    column_name: 'onay-uzman',
    risk_score: 65,
    risk_level: 'medium',
    risk_assessed: 1,
    ai_risk_score: 68,
    creator_email: 'betuldadas82@gmail.com',
    created_at: '2026-09-28T09:15:00.000Z',
    updated_at: '2026-09-28T09:30:00.000Z'
  },
  {
    id: 'rep-02',
    title: 'Sulama Kanalında Tarımsal Atık ve Kimyasal Kirlilik Bildirimi',
    location: 'Konya, Çumra, Alibeyhüyüğü Mahallesi, Tarımsal Sulama Ana Kanalı',
    province: 'Konya',
    district: 'Çumra',
    latitude: 37.575,
    longitude: 32.775,
    category: 'discharge',
    incident_category: 'endüstriyel atık',
    tracking_code: 'AG-2026-C87KJ',
    reporter_name: 'Ahmet Çiftçi',
    reporter_email: 'ahmet@example.com',
    privacy_level: 'acik',
    description: 'Sulama kanalına gübre ve tarımsal kimyasal atık boşaltıldığı görülmektedir.',
    column_name: 'onay-uzman',
    risk_score: 82,
    risk_level: 'high',
    risk_assessed: 1,
    ai_risk_score: 85,
    creator_email: 'meriguclu123@gmail.com',
    created_at: '2026-09-28T10:30:00.000Z',
    updated_at: '2026-09-28T10:45:00.000Z'
  },
  {
    id: 'rep-03',
    title: 'Su Kirliliği ve Çevre İhlali Bildirim Raporu',
    location: 'İstanbul, Tuzla, Aydınlı Mahallesi, Sanayi Caddesi kesişimindeki dere yatağı',
    province: 'İstanbul',
    district: 'Tuzla',
    latitude: 40.852,
    longitude: 29.308,
    category: 'discharge',
    incident_category: 'endüstriyel atık',
    tracking_code: 'AG-2026-T82PL',
    reporter_name: 'Vatandaş Gözlemci',
    reporter_email: 'meriguclu123@gmail.com',
    privacy_level: 'acik',
    description: 'Sanayi bölgesindeki dere yatağında kimyasal renk değişimi ve yağ tabakası mevcut.',
    column_name: 'onay-uzman',
    risk_score: 88,
    risk_level: 'critical',
    risk_assessed: 1,
    ai_risk_score: 91,
    creator_email: 'meriguclu123@gmail.com',
    created_at: '2026-09-28T11:45:00.000Z',
    updated_at: '2026-09-28T11:55:00.000Z'
  },
  {
    id: 'rep-04',
    title: 'Dere Yatağında Katı Atık ve Plastik Kirliliği',
    location: 'Antalya, Muratpaşa, Lara Sahil falez çıkışı / dere döküntü',
    province: 'Antalya',
    district: 'Muratpaşa',
    latitude: 36.852,
    longitude: 30.751,
    category: 'waste',
    incident_category: 'evsel atık',
    tracking_code: 'AG-2026-X6VOG',
    reporter_name: 'Local Super Admin',
    reporter_email: 'meriguclu123@gmail.com',
    privacy_level: 'acik',
    description: 'Falezler bölgesinde dere çıkışında yoğun plastik atık birikmesi tespit edildi.',
    column_name: 'yeni',
    risk_score: 45,
    risk_level: 'low',
    risk_assessed: 0,
    ai_risk_score: 52,
    creator_email: 'meriguclu123@gmail.com',
    created_at: '2026-09-28T12:00:00.000Z',
    updated_at: '2026-09-28T12:00:00.000Z'
  }
];

const insertRep = db.prepare(`
  INSERT INTO reports (
    id, title, location, province, district, latitude, longitude,
    category, incident_category, tracking_code, reporter_name, reporter_email,
    privacy_level, description, column_name, risk_score, risk_level,
    risk_assessed, ai_risk_score, creator_email, assignee_json, tags_json,
    approvals_json, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, '[]', '[]',
    '[]', ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    location = excluded.location,
    province = excluded.province,
    district = excluded.district,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    category = excluded.category,
    incident_category = excluded.incident_category,
    tracking_code = excluded.tracking_code,
    reporter_name = excluded.reporter_name,
    reporter_email = excluded.reporter_email,
    privacy_level = excluded.privacy_level,
    description = excluded.description,
    column_name = excluded.column_name,
    risk_score = excluded.risk_score,
    risk_level = excluded.risk_level,
    risk_assessed = excluded.risk_assessed,
    ai_risk_score = excluded.ai_risk_score,
    creator_email = excluded.creator_email,
    updated_at = excluded.updated_at
`);

for (const r of reports) {
  insertRep.run(
    r.id, r.title, r.location, r.province, r.district, r.latitude, r.longitude,
    r.category, r.incident_category, r.tracking_code, r.reporter_name, r.reporter_email,
    r.privacy_level, r.description, r.column_name, r.risk_score, r.risk_level,
    r.risk_assessed, r.ai_risk_score, r.creator_email, r.created_at, r.updated_at
  );
}

// Stations
const stations = [
  { id: 'st-01', name: 'Marmara - Tuzla İstasyonu', location: 'Tuzla, İstanbul', lat: 40.85, lng: 29.31 },
  { id: 'st-02', name: 'Ege - Bornova İzleme İstasyonu', location: 'Bornova, İzmir', lat: 38.46, lng: 27.22 },
  { id: 'st-03', name: 'İç Anadolu - Çumra İstasyonu', location: 'Çumra, Konya', lat: 37.58, lng: 32.78 },
  { id: 'st-04', name: 'Akdeniz - Lara İstasyonu', location: 'Muratpaşa, Antalya', lat: 36.85, lng: 30.75 }
];

const insertSt = db.prepare(`
  INSERT OR REPLACE INTO stations (id, name, location, latitude, longitude, measurements_json, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, '{}', ?, ?)
`);

for (const s of stations) {
  insertSt.run(s.id, s.name, s.location, s.lat, s.lng, now, now);
}

console.log('Seeded reports successfully:', db.prepare('SELECT count(*) as c FROM reports').get().c);
console.log('Seeded stations successfully:', db.prepare('SELECT count(*) as c FROM stations').get().c);
