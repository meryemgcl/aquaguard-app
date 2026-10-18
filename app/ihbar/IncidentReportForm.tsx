'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { incidentSubmissionSchema } from '@/lib/incident-validation';
import type { Coordinates, IncidentPrivacyLevel, WaterIncidentCategory } from '@/lib/types';
import styles from './page.module.css';

const IncidentMapPicker = dynamic(() => import('./IncidentMapPicker'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Harita yükleniyor…</div>,
});

interface EvidenceFile {
  id: string;
  file: File;
  previewUrl: string;
}

const CATEGORIES: WaterIncidentCategory[] = [
  'endüstriyel atık',
  'evsel atık',
  'balık ölümü',
  'renk/koku değişimi',
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 4;

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`${file.name} görseli okunamadı.`));
    }, { once: true });
    reader.addEventListener('error', () => reject(new Error(`${file.name} görseli okunamadı.`)), { once: true });
    reader.readAsDataURL(file);
  });
}

export default function IncidentReportForm() {
  const [category, setCategory] = useState<WaterIncidentCategory | ''>('');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [contact, setContact] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<IncidentPrivacyLevel>('anonim');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationMessage, setLocationMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => {
    evidence.forEach(item => URL.revokeObjectURL(item.previewUrl));
  }, [evidence]);

  const selectCoordinates = (nextCoordinates: Coordinates) => {
    setCoordinates(nextCoordinates);
    setErrors(current => ({ ...current, coordinates: '' }));
    setLocationMessage('Konum pini seçildi. Haritada başka bir noktaya dokunarak düzeltebilirsiniz.');
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Bu cihaz konum alamıyor. Haritada konumu elle seçin.');
      return;
    }
    setLocationMessage('Konum izni bekleniyor…');
    navigator.geolocation.getCurrentPosition(
      position => {
        selectCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setLocationMessage('Mevcut konum alındı. Doğru noktayı gösterdiğini kontrol edin.');
      },
      () => setLocationMessage('Konum alınamadı. Tarayıcı iznini kontrol edin veya haritada seçim yapın.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const addEvidence = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const totalCurrentSize = evidence.reduce((sum, item) => sum + item.file.size, 0);
    const nextErrors: string[] = [];

    if (evidence.length + incoming.length > MAX_IMAGES) {
      nextErrors.push(`En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz.`);
    }
    for (const file of incoming) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        nextErrors.push(`${file.name}: JPG, PNG veya WebP kullanın.`);
      } else if (file.size > MAX_IMAGE_BYTES) {
        nextErrors.push(`${file.name}: Görsel 5 MB sınırını aşmamalıdır.`);
      }
    }
    const validIncoming = incoming.filter(file =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= MAX_IMAGE_BYTES,
    );
    if (totalCurrentSize + validIncoming.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      nextErrors.push('Fotoğrafların toplam boyutu 20 MB sınırını aşamaz.');
    }
    setFormError(nextErrors.join(' '));

    if (nextErrors.some(message => message.startsWith('En fazla')) ||
        totalCurrentSize + validIncoming.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return;

    setEvidence(current => [
      ...current,
      ...validIncoming.map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    setErrors(current => ({ ...current, photos: '' }));
  };

  const removeEvidence = (id: string) => {
    const selected = evidence.find(item => item.id === id);
    if (selected) URL.revokeObjectURL(selected.previewUrl);
    setEvidence(current => current.filter(item => item.id !== id));
  };

  const submitIncident = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setFormError('');
    setCopied(false);

    let photoData: string[];
    try {
      photoData = await Promise.all(evidence.map(item => fileToDataUrl(item.file)));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Fotoğraf okunamadı.');
      return;
    }

    const validation = incidentSubmissionSchema.safeParse({
      privacyLevel,
      reporterName: privacyLevel === 'anonim' ? undefined : reporterName,
      contact: privacyLevel === 'anonim' ? undefined : contact,
      category,
      description,
      addressText,
      province,
      district,
      coordinates,
      photos: photoData,
    });
    if (!validation.success) {
      const nextErrors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        const key = issue.path[0]?.toString() ?? 'form';
        nextErrors[key] ??= issue.message;
      });
      setErrors(nextErrors);
      const firstInvalid = Object.keys(nextErrors)[0];
      document.getElementById(firstInvalid === 'reporterName'
        ? 'incident-reporter-name'
        : `incident-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = typeof result === 'object' && result !== null && 'error' in result &&
          typeof result.error === 'string' ? result.error : 'İhbar gönderilemedi.';
        throw new Error(errorMessage);
      }
      if (typeof result !== 'object' || result === null || !('trackingCode' in result) ||
          typeof result.trackingCode !== 'string') {
        throw new Error('İhbar kaydedildi ancak takip kodu alınamadı. Lütfen İhbar Takip sayfasında daha sonra tekrar deneyin.');
      }
      setTrackingCode(result.trackingCode);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'İhbar gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyTrackingCode = async () => {
    if (!trackingCode) return;
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setFormError('');
    } catch {
      setFormError('Kopyalama başarısız oldu. Takip kodunu seçip elle kopyalayabilirsiniz.');
    }
  };

  return (
    <>
      <form className={styles.form} onSubmit={submitIncident} noValidate>
        <section className={styles.formSection} aria-labelledby="incident-details-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>1</span>
            <div>
              <h2 id="incident-details-heading">Ne fark ettiniz?</h2>
              <p>Gördüğünüz olayı kendi sözlerinizle anlatın.</p>
            </div>
          </div>

          <label className={styles.field} htmlFor="incident-category">
            <span>Olay türü <span aria-hidden="true">*</span></span>
            <select
              id="incident-category"
              value={category}
              onChange={event => setCategory(event.target.value as WaterIncidentCategory | '')}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'error-category' : undefined}
              required
            >
              <option value="" disabled>Bir olay türü seçin</option>
              {CATEGORIES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            {errors.category && <span id="error-category" className={styles.fieldError}>{errors.category}</span>}
          </label>

          <label className={styles.field} htmlFor="incident-description">
            <span>Açıklama <span aria-hidden="true">*</span></span>
            <textarea
              id="incident-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Ne gördünüz ve ne zaman fark ettiniz? Örneğin suyun rengi, kokusu veya etkilenen canlılar."
              minLength={10}
              maxLength={2500}
              rows={5}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'error-description description-count' : 'description-count'}
              required
            />
            <span id="description-count" className={styles.characterCount}>{description.length}/2500</span>
            {errors.description && <span id="error-description" className={styles.fieldError}>{errors.description}</span>}
          </label>
        </section>

        <section className={styles.formSection} aria-labelledby="incident-location-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>2</span>
            <div>
              <h2 id="incident-location-heading">Olay nerede?</h2>
              <p>Haritada noktayı seçin veya cihazınızın konumunu kullanın.</p>
            </div>
          </div>

          <button type="button" className={styles.locationButton} onClick={useCurrentLocation}>
            Mevcut Konumumu Kullan
          </button>
          <p className={styles.locationMessage} role="status" aria-live="polite">{locationMessage}</p>
          <div id="incident-coordinates" className={styles.mapFrame}>
            <IncidentMapPicker coordinates={coordinates} onSelect={selectCoordinates} />
          </div>
          <div className={styles.coordinateSummary} aria-live="polite">
            {coordinates
              ? `Seçilen konum: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
              : 'İhbar için haritada bir nokta seçin.'}
          </div>
          {errors.coordinates && <p id="error-coordinates" className={styles.fieldError} role="alert">{errors.coordinates}</p>}
          <label className={styles.field} htmlFor="incident-address">
            <span>Yakınındaki yer veya adres <span aria-hidden="true">*</span></span>
            <input
              id="incident-address"
              type="text"
              value={addressText}
              onChange={event => setAddressText(event.target.value)}
              placeholder="Örn. Merkez Mahallesi, köprü yanı"
              maxLength={240}
              aria-invalid={!!errors.addressText}
              aria-describedby={errors.addressText ? 'error-addressText' : undefined}
              required
            />
            {errors.addressText && <span id="error-addressText" className={styles.fieldError}>{errors.addressText}</span>}
          </label>
          <div className={styles.locationFields}>
            <label className={styles.field} htmlFor="incident-province">
              <span>İl <span aria-hidden="true">*</span></span>
              <input
                id="incident-province"
                type="text"
                value={province}
                onChange={event => setProvince(event.target.value)}
                placeholder="Örn. İzmir"
                maxLength={80}
                aria-invalid={!!errors.province}
                aria-describedby={errors.province ? 'error-province' : undefined}
                required
              />
              {errors.province && <span id="error-province" className={styles.fieldError}>{errors.province}</span>}
            </label>
            <label className={styles.field} htmlFor="incident-district">
              <span>İlçe <span aria-hidden="true">*</span></span>
              <input
                id="incident-district"
                type="text"
                value={district}
                onChange={event => setDistrict(event.target.value)}
                placeholder="Örn. Foça"
                maxLength={80}
                aria-invalid={!!errors.district}
                aria-describedby={errors.district ? 'error-district' : undefined}
                required
              />
              {errors.district && <span id="error-district" className={styles.fieldError}>{errors.district}</span>}
            </label>
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="incident-evidence-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>3</span>
            <div>
              <h2 id="incident-evidence-heading">Fotoğraf ekleyin</h2>
              <p>En az bir fotoğraf ekleyin. Görseller bu cihazda çalışan AquaGuard veritabanında saklanır.</p>
            </div>
          </div>

          <label className={styles.uploadArea} htmlFor="incident-photos">
            <span className={styles.uploadIcon} aria-hidden="true">＋</span>
            <span><strong>Fotoğraf seçin veya çekin</strong><br />JPG, PNG veya WebP · en fazla 4 görsel · her biri 5 MB</span>
            <input
              id="incident-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              onChange={event => {
                addEvidence(event.currentTarget.files);
                event.currentTarget.value = '';
              }}
              aria-describedby={errors.photos ? 'error-photos' : 'photo-help'}
            />
          </label>
          <span id="photo-help" className={styles.helper}>Toplam görsel boyutu 20 MB ile sınırlıdır. Fotoğraflar bu cihazdaki yerel dosya alanında saklanır.</span>
          {errors.photos && <p id="error-photos" className={styles.fieldError} role="alert">{errors.photos}</p>}

          {evidence.length > 0 && (
            <ul className={styles.evidenceList} aria-label="Eklenecek fotoğraflar">
              {evidence.map(item => (
                <li className={styles.evidenceCard} key={item.id}>
                  {/* Local object URL is used only for this browser preview. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={`${item.file.name} önizlemesi`} />
                  <div className={styles.evidenceInfo}>
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <span>{formatFileSize(item.file.size)}</span>
                    <span>Dosya tarihi: {new Date(item.file.lastModified).toLocaleString('tr-TR')}</span>
                  </div>
                  <button type="button" onClick={() => removeEvidence(item.id)} aria-label={`${item.file.name} fotoğrafını kaldır`}>
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.formSection} aria-labelledby="incident-contact-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>4</span>
            <div>
              <h2 id="incident-contact-heading">Gizlilik ve geri dönüş tercihi</h2>
              <p>İletişim bilgisi vermek zorunlu değildir. Tercihinizi gönderimden önce değiştirebilirsiniz.</p>
            </div>
          </div>
          <fieldset className={styles.privacyOptions}>
            <legend>Bildirim gizliliği</legend>
            <label className={styles.privacyChoice}>
              <input type="radio" name="privacy-level" value="anonim" checked={privacyLevel === 'anonim'} onChange={() => setPrivacyLevel('anonim')} />
              <span><strong>Tam anonim</strong><small>Ad veya iletişim bilgisi alınmaz. Takip kodunuzu saklayın.</small></span>
            </label>
            <label className={styles.privacyChoice}>
              <input type="radio" name="privacy-level" value="gizli_iletisim" checked={privacyLevel === 'gizli_iletisim'} onChange={() => setPrivacyLevel('gizli_iletisim')} />
              <span><strong>Gizli iletişim</strong><small>Geri dönüş bilgisi şifreli saklanır; yalnızca yetkili yönetici rolleri görüntüleyebilir.</small></span>
            </label>
            <label className={styles.privacyChoice}>
              <input type="radio" name="privacy-level" value="acik" checked={privacyLevel === 'acik'} onChange={() => setPrivacyLevel('acik')} />
              <span><strong>Açık bildirim</strong><small>Adınız ve geri dönüş bilginiz yalnızca yetkili personel ekranında görünür.</small></span>
            </label>
          </fieldset>
          {privacyLevel !== 'anonim' && (
            <>
              <label className={styles.field} htmlFor="incident-reporter-name">
                <span>Ad veya bildirim adı <span aria-hidden="true">*</span></span>
                <input
                  id="incident-reporter-name"
                  type="text"
                  autoComplete="name"
                  value={reporterName}
                  onChange={event => setReporterName(event.target.value)}
                  maxLength={120}
                  aria-invalid={!!errors.reporterName}
                  aria-describedby={errors.reporterName ? 'error-reporterName' : undefined}
                  required
                />
                {errors.reporterName && <span id="error-reporterName" className={styles.fieldError}>{errors.reporterName}</span>}
              </label>
              <label className={styles.field} htmlFor="incident-contact">
                <span>E-posta adresi veya telefon <span aria-hidden="true">*</span></span>
                <input
                  id="incident-contact"
                  type="text"
                  autoComplete="email"
                  value={contact}
                  onChange={event => setContact(event.target.value)}
                  placeholder="ornek@eposta.com veya +90 5xx xxx xx xx"
                  maxLength={254}
                  aria-invalid={!!errors.contact}
                  aria-describedby={errors.contact ? 'error-contact' : undefined}
                  required
                />
                {errors.contact && <span id="error-contact" className={styles.fieldError}>{errors.contact}</span>}
              </label>
            </>
          )}
        </section>

        {formError && <p className={styles.formError} role="alert">{formError}</p>}
        <button className={`btn btn-primary ${styles.submitButton}`} type="submit" disabled={submitting}>
          {submitting ? 'İhbar kaydediliyor…' : 'İhbarı Gönder'}
        </button>
        <p className={styles.privacyNote}>İhbar verileri yerel AquaGuard sisteminde saklanır. Tam anonim seçiminde iletişim bilgisi alınmaz. Gizli iletişim bilgisi uygulama tarafından şifrelenerek saklanır. Takip kodunuzu güvenli yerde tutun.</p>
      </form>

      {trackingCode && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.confirmation} role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <span className={styles.confirmationIcon} aria-hidden="true">✓</span>
            <h2 id="confirmation-title">İhbarınız alındı</h2>
            <p>İhbarınız inceleme sırasına eklendi. Durumunu takip edebilmek için bu kodu saklayın.</p>
            <div className={styles.trackingCode}>{trackingCode}</div>
            <button type="button" className="btn btn-primary" onClick={copyTrackingCode}>
              {copied ? 'Kod kopyalandı' : 'Takip kodunu kopyala'}
            </button>
            {formError && <p className={styles.fieldError} role="alert">{formError}</p>}
            <Link className={styles.trackLink} href={`/ihbar-takip?kod=${encodeURIComponent(trackingCode)}`}>
              İhbar durumunu görüntüle
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
