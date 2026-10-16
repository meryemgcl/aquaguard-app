'use client';

import { MapContainer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { EmbedMapIncident } from '@/lib/open-data';
import styles from './EmbedMapPage.module.css';

interface Props {
  incidents: EmbedMapIncident[];
}

function riskStyle(level: string): { color: string; label: string } {
  switch (level) {
    case 'Kritik': return { color: '#dc2626', label: 'Kritik' };
    case 'Yüksek': return { color: '#f97316', label: 'Yüksek' };
    case 'Orta': return { color: '#eab308', label: 'Orta' };
    case 'Düşük': return { color: '#3b82f6', label: 'Düşük' };
    default: return { color: '#8892a8', label: 'Değerlendirilmedi' };
  }
}

export default function PublicMap({ incidents }: Props) {
  const center: [number, number] = incidents.length
    ? [incidents[0].latitude, incidents[0].longitude]
    : [39, 35];

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom className={styles.map}>
      {incidents.map(incident => {
        const risk = riskStyle(incident.riskLevel);
        return (
          <CircleMarker
            key={incident.trackingCode}
            center={[incident.latitude, incident.longitude]}
            radius={8}
            pathOptions={{ color: '#fff', fillColor: risk.color, fillOpacity: .9, weight: 2 }}
          >
            <Popup>
              <article className={styles.popup}>
                {incident.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={incident.photo} alt="Yayımlanmış ihbar fotoğrafı" />
                )}
                <strong>{incident.trackingCode}</strong>
                <span className={styles.category}>{incident.category}</span>
                <span>{incident.district || incident.province || 'Bölge belirtilmemiş'}</span>
                <span style={{ color: risk.color, fontWeight: 700 }}>● {risk.label} risk</span>
                <a href={`/ihbar-takip?code=${encodeURIComponent(incident.trackingCode)}`}>Durumu Takip Et</a>
              </article>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
