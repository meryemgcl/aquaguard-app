/* ============================================================
   AquaGuard — Türk Şehir Koordinatları (Statik Geocoding)
   Tüm key'ler Latin harfle yazılmıştır (normalize gerekmez).
   ============================================================ */

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  adana:           { lat: 37.00, lng: 35.32 },
  adiyaman:        { lat: 37.76, lng: 38.28 },
  afyon:           { lat: 38.76, lng: 30.54 },
  agri:            { lat: 39.72, lng: 43.05 },
  aksaray:         { lat: 38.37, lng: 34.04 },
  amasya:          { lat: 40.65, lng: 35.83 },
  ankara:          { lat: 39.93, lng: 32.86 },
  antalya:         { lat: 36.90, lng: 30.70 },
  ardahan:         { lat: 41.11, lng: 42.70 },
  artvin:          { lat: 41.18, lng: 41.82 },
  aydin:           { lat: 37.85, lng: 27.84 },
  balikesir:       { lat: 39.65, lng: 27.89 },
  bartin:          { lat: 41.63, lng: 32.34 },
  batman:          { lat: 37.88, lng: 41.13 },
  bayburt:         { lat: 40.26, lng: 40.22 },
  bilecik:         { lat: 40.15, lng: 29.98 },
  bingol:          { lat: 38.88, lng: 40.50 },
  bitlis:          { lat: 38.40, lng: 42.11 },
  bolu:            { lat: 40.74, lng: 31.61 },
  burdur:          { lat: 37.72, lng: 30.29 },
  bursa:           { lat: 40.19, lng: 29.07 },
  canakkale:       { lat: 40.15, lng: 26.41 },
  cankiri:         { lat: 40.60, lng: 33.62 },
  corum:           { lat: 40.55, lng: 34.96 },
  denizli:         { lat: 37.77, lng: 29.09 },
  diyarbakir:      { lat: 37.91, lng: 40.24 },
  duzce:           { lat: 40.84, lng: 31.17 },
  edirne:          { lat: 41.68, lng: 26.56 },
  elazig:          { lat: 38.67, lng: 39.22 },
  erzincan:        { lat: 39.75, lng: 39.49 },
  erzurum:         { lat: 39.90, lng: 41.27 },
  eskisehir:       { lat: 39.78, lng: 30.52 },
  gaziantep:       { lat: 37.07, lng: 37.38 },
  giresun:         { lat: 40.91, lng: 38.39 },
  gumushane:       { lat: 40.46, lng: 39.47 },
  hakkari:         { lat: 37.57, lng: 43.74 },
  hatay:           { lat: 36.40, lng: 36.35 },
  igdir:           { lat: 39.92, lng: 44.04 },
  isparta:         { lat: 37.76, lng: 30.55 },
  istanbul:        { lat: 41.01, lng: 28.95 },
  izmir:           { lat: 38.42, lng: 27.14 },
  kahramanmaras:   { lat: 37.58, lng: 36.94 },
  karabuk:         { lat: 41.20, lng: 32.62 },
  karaman:         { lat: 37.18, lng: 33.22 },
  kars:            { lat: 40.61, lng: 43.10 },
  kastamonu:       { lat: 41.37, lng: 33.78 },
  kayseri:         { lat: 38.73, lng: 35.49 },
  kirikkale:       { lat: 39.85, lng: 33.51 },
  kirklareli:      { lat: 41.73, lng: 27.22 },
  kirsehir:        { lat: 39.15, lng: 34.17 },
  kilis:           { lat: 36.72, lng: 37.12 },
  kocaeli:         { lat: 40.76, lng: 29.91 },
  izmit:           { lat: 40.76, lng: 29.91 },
  konya:           { lat: 37.87, lng: 32.49 },
  kutahya:         { lat: 39.42, lng: 29.99 },
  malatya:         { lat: 38.35, lng: 38.31 },
  manisa:          { lat: 38.61, lng: 27.43 },
  mardin:          { lat: 37.31, lng: 40.74 },
  mersin:          { lat: 36.80, lng: 34.64 },
  mugla:           { lat: 37.22, lng: 28.36 },
  mus:             { lat: 38.73, lng: 41.49 },
  nevsehir:        { lat: 38.62, lng: 34.71 },
  nigde:           { lat: 37.97, lng: 34.68 },
  ordu:            { lat: 40.98, lng: 37.88 },
  osmaniye:        { lat: 37.07, lng: 36.25 },
  rize:            { lat: 41.02, lng: 40.52 },
  sakarya:         { lat: 40.69, lng: 30.40 },
  adapazari:       { lat: 40.69, lng: 30.40 },
  samsun:          { lat: 41.29, lng: 36.33 },
  siirt:           { lat: 37.93, lng: 41.95 },
  sinop:           { lat: 42.02, lng: 35.15 },
  sivas:           { lat: 39.75, lng: 37.02 },
  sanliurfa:       { lat: 37.16, lng: 38.80 },
  urfa:            { lat: 37.16, lng: 38.80 },
  sirnak:          { lat: 37.52, lng: 42.46 },
  tekirdag:        { lat: 40.98, lng: 27.51 },
  tokat:           { lat: 40.31, lng: 36.55 },
  trabzon:         { lat: 41.00, lng: 39.73 },
  tunceli:         { lat: 39.11, lng: 39.55 },
  usak:            { lat: 38.67, lng: 29.41 },
  van:             { lat: 38.49, lng: 43.38 },
  yalova:          { lat: 40.65, lng: 29.27 },
  yozgat:          { lat: 39.82, lng: 34.81 },
  zonguldak:       { lat: 41.45, lng: 31.79 },
};

/** Türkçe karakterleri Latin'e çevirir */
function turkishToLatin(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Konum metninden Türkiye şehir adını bulup koordinat döner.
 * Örnek: "Erzurum, Türkiye" → { lat: 39.90, lng: 41.27 }
 * Bulunamazsa Türkiye merkezi döner.
 */
export function geocodeLocation(location: string | undefined | null): { lat: number; lng: number } {
  if (!location) return { lat: 39.92, lng: 32.85 }; // Ankara (varsayılan merkez)
  const normalized = turkishToLatin(location);

  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) {
      // Hafif rastgele offset — aynı şehirde birden fazla rapor üst üste gelmesin
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.25,
        lng: coords.lng + (Math.random() - 0.5) * 0.25,
      };
    }
  }

  // Bulunamadı → Türkiye merkezi
  console.warn('[geocode] Şehir bulunamadı:', location, '→ Türkiye merkezi kullanılıyor.');
  return {
    lat: 39.0 + (Math.random() - 0.5) * 2,
    lng: 35.0 + (Math.random() - 0.5) * 2,
  };
}

/** Risk skoru → seviye ve renk */
export function riskScoreToColor(score: number): { riskLevel: string; riskColor: string } {
  if (score < 30) return { riskLevel: 'low',      riskColor: '#00ff88' };
  if (score < 60) return { riskLevel: 'medium',   riskColor: '#f59e0b' };
  if (score < 80) return { riskLevel: 'high',     riskColor: '#ff6b35' };
  return              { riskLevel: 'critical',  riskColor: '#ff4444' };
}
