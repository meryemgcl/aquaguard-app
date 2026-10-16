'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { isRecord } from '@/lib/validation';
import styles from './StationOperations.module.css';

interface Station {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
}

interface Measurement {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: string;
  qualityFlag: string;
  calibrationStatus: string;
}

interface Threshold {
  id: string;
  parameter: string;
  unit: string;
  comparator: 'above' | 'below';
  thresholdValue: number;
  hysteresis: number;
  severity: string;
  consecutiveCount: number;
  activeFrom: string;
  activeUntil: string | null;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error('Sunucudan geçersiz yanıt alındı.');
  }
  return body;
}

function isStation(value: unknown): value is Station {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.location === 'string' &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number';
}

function isMeasurement(value: unknown): value is Measurement {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.parameter === 'string' &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    typeof value.measuredAt === 'string' &&
    typeof value.source === 'string' &&
    typeof value.qualityFlag === 'string' &&
    typeof value.calibrationStatus === 'string';
}

function isThreshold(value: unknown): value is Threshold {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.parameter === 'string' &&
    typeof value.unit === 'string' &&
    (value.comparator === 'above' || value.comparator === 'below') &&
    typeof value.thresholdValue === 'number' &&
    typeof value.hysteresis === 'number' &&
    typeof value.severity === 'string' &&
    typeof value.consecutiveCount === 'number' &&
    typeof value.activeFrom === 'string' &&
    (typeof value.activeUntil === 'string' || value.activeUntil === null);
}

export default function StationOperationsClient() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey(value => value + 1), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      try {
        const [stationResponse, thresholdResponse] = await Promise.all([
          fetch('/api/stations', { cache: 'no-store' }),
          fetch('/api/measurement-thresholds', { cache: 'no-store' }),
        ]);
        const [stationBody, thresholdBody] = await Promise.all([
          readJson(stationResponse),
          readJson(thresholdResponse),
        ]);
        if (!stationResponse.ok) throw new Error(String(stationBody.error || 'İstasyonlar yüklenemedi.'));
        if (!thresholdResponse.ok) throw new Error(String(thresholdBody.error || 'Eşikler yüklenemedi.'));
        if (
          !Array.isArray(stationBody.stations) || !stationBody.stations.every(isStation) ||
          !Array.isArray(thresholdBody.thresholds) || !thresholdBody.thresholds.every(isThreshold)
        ) {
          throw new Error('İstasyon veya eşik yanıtının biçimi geçersiz.');
        }
        if (active) {
          const loadedStations = stationBody.stations;
          setStations(loadedStations);
          setThresholds(thresholdBody.thresholds);
          setSelectedStation(current => current || loadedStations[0]?.id || '');
          setError(null);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'İstasyon verileri yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [user, reloadKey]);

  useEffect(() => {
    if (!selectedStation) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/stations/${encodeURIComponent(selectedStation)}/measurements`, {
          cache: 'no-store',
        });
        const body = await readJson(response);
        if (!response.ok) throw new Error(String(body.error || 'Ölçümler yüklenemedi.'));
        if (!Array.isArray(body.measurements) || !body.measurements.every(isMeasurement)) {
          throw new Error('Ölçüm yanıtının biçimi geçersiz.');
        }
        if (active) setMeasurements(body.measurements);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Ölçümler yüklenemedi.');
      }
    };
    void load();
    return () => { active = false; };
  }, [selectedStation, reloadKey]);

  const createStation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch('/api/stations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        location: form.get('location'),
        latitude: Number(form.get('latitude')),
        longitude: Number(form.get('longitude')),
      }),
    });
    const body = await readJson(response);
    if (!response.ok) throw new Error(String(body.error || 'İstasyon oluşturulamadı.'));
    toast.success('İstasyon oluşturuldu.');
    formElement.reset();
    reload();
  };

  const addMeasurement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStation) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const measuredAt = form.get('measuredAt');
    const response = await fetch(`/api/stations/${encodeURIComponent(selectedStation)}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parameter: form.get('parameter'),
        value: Number(form.get('value')),
        unit: form.get('unit'),
        measuredAt: new Date(String(measuredAt)).toISOString(),
        source: 'manual',
        sourceRecordId: crypto.randomUUID(),
        qualityFlag: form.get('qualityFlag'),
        calibrationStatus: 'not_applicable',
      }),
    });
    const body = await readJson(response);
    if (!response.ok) throw new Error(String(body.error || 'Ölçüm eklenemedi.'));
    toast.success('Ölçüm kaydedildi.');
    formElement.reset();
    reload();
  };

  const addThreshold = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch('/api/measurement-thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parameter: form.get('parameter'),
        unit: form.get('unit'),
        comparator: form.get('comparator'),
        thresholdValue: Number(form.get('thresholdValue')),
        hysteresis: Number(form.get('hysteresis')),
        severity: form.get('severity'),
        consecutiveCount: Number(form.get('consecutiveCount')),
        activeFrom: new Date().toISOString(),
      }),
    });
    const body = await readJson(response);
    if (!response.ok) throw new Error(String(body.error || 'Eşik eklenemedi.'));
    toast.success('Ölçüm eşiği kaydedildi.');
    formElement.reset();
    reload();
  };

  const handleSubmit = (action: (event: FormEvent<HTMLFormElement>) => Promise<void>) =>
    (event: FormEvent<HTMLFormElement>) => {
      void action(event).catch(submitError => {
        toast.error(submitError instanceof Error ? submitError.message : 'İşlem tamamlanamadı.');
      });
    };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>İstasyonlar ve ölçümler</h1>
          <p>Ölçüm kaynağını, birimini ve kalite durumunu kayıtla birlikte izleyin.</p>
        </div>
        <a className={styles.secondaryButton} href="/api/measurements/export">Ölçümleri CSV indir</a>
      </header>

      {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={reload}>Yeniden dene</button></div>}
      {loading ? <p className={styles.state}>İstasyon verileri yükleniyor…</p> : (
        <>
          <div className={styles.layout}>
            <section className={styles.panel}>
              <h2>İstasyon kaydı</h2>
              <form className={styles.form} onSubmit={handleSubmit(createStation)}>
                <label>İstasyon adı<input name="name" maxLength={120} required /></label>
                <label>Konum<input name="location" maxLength={240} required /></label>
                <div className={styles.twoColumns}>
                  <label>Enlem<input name="latitude" type="number" min="-90" max="90" step="any" required /></label>
                  <label>Boylam<input name="longitude" type="number" min="-180" max="180" step="any" required /></label>
                </div>
                <button type="submit">İstasyon ekle</button>
              </form>
              <label className={styles.stationSelect}>Ölçüm yapılacak istasyon
                <select value={selectedStation} onChange={event => {
                  setSelectedStation(event.target.value);
                  setMeasurements([]);
                }}>
                  <option value="">İstasyon seçin</option>
                  {stations.map(station => <option key={station.id} value={station.id}>{station.name} — {station.location}</option>)}
                </select>
              </label>
              {!stations.length && <p className={styles.state}>Henüz istasyon yok; ilk istasyonu ekleyin.</p>}
            </section>

            <section className={styles.panel}>
              <h2>Manuel ölçüm girişi</h2>
                    <p className={styles.help}>Sensör/laboratuvar bağlantısı yapılandırılana kadar bu form yalnızca personel tarafından girilen manuel veriyi kaydeder.</p>
              <form className={styles.form} onSubmit={handleSubmit(addMeasurement)}>
                <div className={styles.twoColumns}>
                  <label>Parametre anahtarı<input name="parameter" placeholder="ph, turbidity" pattern="[a-z][a-z0-9_]{0,39}" required /></label>
                  <label>Birim<input name="unit" placeholder="pH, NTU, mg/L" maxLength={24} required /></label>
                </div>
                <div className={styles.twoColumns}>
                  <label>Değer<input name="value" type="number" step="any" required /></label>
                  <label>Ölçüm zamanı<input name="measuredAt" type="datetime-local" required /></label>
                </div>
                <label>Veri kalitesi
                  <select name="qualityFlag" defaultValue="valid">
                    <option value="valid">Geçerli</option>
                    <option value="suspect">Şüpheli</option>
                    <option value="invalid">Geçersiz</option>
                  </select>
                </label>
                <button type="submit" disabled={!selectedStation}>Ölçümü kaydet</button>
              </form>
            </section>

            <section className={styles.panel}>
              <h2>Ölçüm eşiği ve uyarı</h2>
              <p className={styles.help}>Eşikler tek parametre ve birim için değerlendirilir; uygulama mevzuat limitlerini kendiliğinden varsaymaz.</p>
              {user && (user.role === 'super_admin' || user.role === 'admin') ? (
              <form className={styles.form} onSubmit={handleSubmit(addThreshold)}>
                <div className={styles.twoColumns}>
                  <label>Parametre<input name="parameter" placeholder="ph, dissolved_oxygen" pattern="[a-z][a-z0-9_]{0,39}" required /></label>
                  <label>Birim<input name="unit" placeholder="pH, mg/L" maxLength={24} required /></label>
                </div>
                <div className={styles.twoColumns}>
                  <label>Koşul<select name="comparator"><option value="above">Eşikten yüksek</option><option value="below">Eşikten düşük</option></select></label>
                  <label>Eşik değeri<input name="thresholdValue" type="number" step="any" required /></label>
                </div>
                <div className={styles.twoColumns}>
                  <label>Histerezis<input name="hysteresis" type="number" min="0" step="any" defaultValue="0" required /></label>
                  <label>Şiddet<select name="severity"><option value="medium">Orta</option><option value="high">Yüksek</option><option value="critical">Kritik</option><option value="low">Düşük</option></select></label>
                </div>
                <label>Tetikleme için ardışık ölçüm<input name="consecutiveCount" type="number" min="1" max="20" defaultValue="1" required /></label>
                <button type="submit">Eşiği kaydet</button>
              </form>
              ) : <p className={styles.state}>Ölçüm eşiklerini yalnızca sistem yöneticileri değiştirebilir.</p>}
            </section>
          </div>

          <section className={styles.panel}>
            <h2>Eşik yapılandırmaları</h2>
            {thresholds.length === 0 ? <p className={styles.state}>Henüz eşik tanımlanmamış.</p> : (
              <div className={styles.tableWrap}>
                <table>
                  <thead><tr><th>Parametre</th><th>Koşul</th><th>Eşik</th><th>Şiddet</th><th>Ardışık veri</th><th>Yürürlük</th></tr></thead>
                  <tbody>{thresholds.map(threshold => (
                    <tr key={threshold.id}>
                      <td>{threshold.parameter} ({threshold.unit})</td>
                      <td>{threshold.comparator === 'above' ? '>' : '<'}</td>
                      <td>{threshold.thresholdValue}</td>
                      <td>{threshold.severity}</td>
                      <td>{threshold.consecutiveCount}</td>
                      <td>{new Date(threshold.activeFrom).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <h2>Son ölçümler {selectedStation ? `· ${stations.find(station => station.id === selectedStation)?.name ?? ''}` : ''}</h2>
            {!selectedStation || measurements.length === 0 ? <p className={styles.state}>Seçilen istasyon için ölçüm kaydı yok.</p> : (
              <div className={styles.tableWrap}>
                <table>
                  <thead><tr><th>Parametre</th><th>Değer</th><th>Zaman</th><th>Kaynak</th><th>Kalite</th><th>Kalibrasyon</th></tr></thead>
                  <tbody>{measurements.map(measurement => (
                    <tr key={measurement.id}>
                      <td>{measurement.parameter}</td>
                      <td>{measurement.value} {measurement.unit}</td>
                      <td>{new Date(measurement.measuredAt).toLocaleString('tr-TR')}</td>
                      <td>{measurement.source}</td>
                      <td>{measurement.qualityFlag}</td>
                      <td>{measurement.calibrationStatus}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
