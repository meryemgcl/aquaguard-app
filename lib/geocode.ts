/* ============================================================
   AquaGuard — Türk Şehir Koordinatları (Statik Geocoding)
   Yeni rapor eklendiğinde şehir adından lat/lng üretmek için kullanılır.
   ============================================================ */

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // İller
  adana:        { lat: 37.00, lng: 35.32 },
  adıyaman:     { lat: 37.76, lng: 38.28 },
  afyonkarahisar: { lat: 38.76, lng: 30.54 },
  ağrı:         { lat: 39.72, lng: 43.05 },
  aksaray:      { lat: 38.37, lng: 34.04 },
  amasya:       { lat: 40.65, lng: 35.83 },
  ankara:       { lat: 39.93, lng: 32.86 },
  antalya:      { lat: 36.90, lng: 30.70 },
  ardahan:      { lat: 41.11, lng: 42.70 },
  artvin:       { lat: 41.18, lng: 41.82 },
  aydın:        { lat: 37.85, lng: 27.84 },
  balıkesir:    { lat: 39.65, lng: 27.89 },
  bartın:       { lat: 41.63, lng: 32.34 },
  batman:       { lat: 37.88, lng: 41.13 },
  bayburt:      { lat: 40.26, lng: 40.22 },
  bilecik:      { lat: 40.15, lng: 29.98 },
  bingöl:       { lat: 38.88, lng: 40.50 },
  bitlis:       { lat: 38.40, lng: 42.11 },
  bolu:         { lat: 40.74, lng: 31.61 },
  burdur:       { lat: 37.72, lng: 30.29 },
  bursa:        { lat: 40.19, lng: 29.07 },
  çanakkale:    { lat: 40.15, lng: 26.41 },
  çankırı:      { lat: 40.60, lng: 33.62 },
  çorum:        { lat: 40.55, lng: 34.96 },
  denizli:      { lat: 37.77, lng: 29.09 },
  diyarbakır:   { lat: 37.91, lng: 40.24 },
  düzce:        { lat: 40.84, lng: 31.17 },
  edirne:       { lat: 41.68, lng: 26.56 },
  elazığ:       { lat: 38.67, lng: 39.22 },
  erzincan:     { lat: 39.75, lng: 39.49 },
  erzurum:      { lat: 39.90, lng: 41.27 },
  eskişehir:    { lat: 39.78, lng: 30.52 },
  gaziantep:    { lat: 37.07, lng: 37.38 },
  giresun:      { lat: 40.91, lng: 38.39 },
  gümüşhane:    { lat: 40.46, lng: 39.47 },
  hakkari:      { lat: 37.57, lng: 43.74 },
  hatay:        { lat: 36.40, lng: 36.35 },
  ığdır:        { lat: 39.92, lng: 44.04 },
  isparta:      { lat: 37.76, lng: 30.55 },
  istanbul:     { lat: 41.01, lng: 28.95 },
  izmir:        { lat: 38.42, lng: 27.14 },
  kahramanmaraş: { lat: 37.58, lng: 36.94 },
  karabük:      { lat: 41.20, lng: 32.62 },
  karaman:      { lat: 37.18, lng: 33.22 },
  kars:         { lat: 40.61, lng: 43.10 },
  kastamonu:    { lat: 41.37, lng: 33.78 },
  kayseri:      { lat: 38.73, lng: 35.49 },
  kırıkkale:    { lat: 39.85, lng: 33.51 },
  kırklareli:   { lat: 41.73, lng: 27.22 },
  kırşehir:     { lat: 39.15, lng: 34.17 },
  kilis:        { lat: 36.72, lng: 37.12 },
  kocaeli:      { lat: 40.76, lng: 29.91 },
  konya:        { lat: 37.87, lng: 32.49 },
  kütahya:      { lat: 39.42, lng: 29.99 },
  malatya:      { lat: 38.35, lng: 38.31 },
  manisa:       { lat: 38.61, lng: 27.43 },
  mardin:       { lat: 37.31, lng: 40.74 },
  mersin:       { lat: 36.80, lng: 34.64 },
  muğla:        { lat: 37.22, lng: 28.36 },
  muş:          { lat: 38.73, lng: 41.49 },
  nevşehir:     { lat: 38.62, lng: 34.71 },
  niğde:        { lat: 37.97, lng: 34.68 },
  ordu:         { lat: 40.98, lng: 37.88 },
  osmaniye:     { lat: 37.07, lng: 36.25 },
  rize:         { lat: 41.02, lng: 40.52 },
  sakarya:      { lat: 40.69, lng: 30.40 },
  samsun:       { lat: 41.29, lng: 36.33 },
  siirt:        { lat: 37.93, lng: 41.95 },
  sinop:        { lat: 42.02, lng: 35.15 },
  sivas:        { lat: 39.75, lng: 37.02 },
  şanlıurfa:    { lat: 37.16, lng: 38.80 },
  şırnak:       { lat: 37.52, lng: 42.46 },
  tekirdağ:     { lat: 40.98, lng: 27.51 },
  tokat:        { lat: 40.31, lng: 36.55 },
  trabzon:      { lat: 41.00, lng: 39.73 },
  tunceli:      { lat: 39.11, lng: 39.55 },
  uşak:         { lat: 38.67, lng: 29.41 },
  van:          { lat: 38.49, lng: 43.38 },
  yalova:       { lat: 40.65, lng: 29.27 },
  yozgat:       { lat: 39.82, lng: 34.81 },
  zonguldak:    { lat: 41.45, lng: 31.79 },
};

/** Verilen konum metninden Türkçe şehir adı bulup koordinat döner.
 *  Eğer bulunamazsa Türkiye merkezi koordinatını döner. */
export function geocodeLocation(location: string): { lat: number; lng: number } {
  const lower = location.toLowerCase()
    // Türkçe karakterleri normalize et
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');

  // Tam eşleşme ara
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const normalCity = city.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
    if (lower.includes(normalCity)) {
      // Hafif rastgele offset ekle — aynı şehirde birden fazla marker olduğunda üst üste gelmesin
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.3,
        lng: coords.lng + (Math.random() - 0.5) * 0.3,
      };
    }
  }

  // Bulunamadı → Türkiye merkezi (Kırşehir civarı)
  return { lat: 39.0 + (Math.random() - 0.5) * 2, lng: 35.0 + (Math.random() - 0.5) * 2 };
}

/** Risk skoru → renkler */
export function riskScoreToColor(score: number): { riskLevel: string; riskColor: string } {
  if (score < 30)  return { riskLevel: 'low',      riskColor: '#00ff88' };
  if (score < 60)  return { riskLevel: 'medium',   riskColor: '#f59e0b' };
  if (score < 80)  return { riskLevel: 'high',     riskColor: '#ff6b35' };
  return               { riskLevel: 'critical',  riskColor: '#ff4444' };
}
