'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './Dashboard.module.css';

interface MapMarker {
  id: string;
  location: string;
  lat: number;
  lng: number;
  riskScore: number;
  riskLevel: string;
  riskColor: string;
  lastMeasurement: string;
  params: { ph: number; turbidity: number; dissolvedO2: number; temperature: number };
}

interface Props {
  markers: MapMarker[];
  height?: string;
  zoom?: number;
  center?: [number, number];
}

export default function WaterMap({ markers, height = '380px', zoom = 6, center = [39.5, 32.5] }: Props) {
  return (
    <div className={styles.mapWrapper} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map(m => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.riskScore > 70 ? 14 : m.riskScore > 40 ? 11 : 8}
            pathOptions={{
              color: m.riskColor,
              fillColor: m.riskColor,
              fillOpacity: 0.35,
              weight: 2,
              opacity: 0.9,
            }}
          >
            <Popup>
              <div style={{
                background: '#111827', color: '#e8eeff', borderRadius: '10px',
                padding: '14px 16px', minWidth: '200px', fontFamily: 'Inter, sans-serif',
                border: `1px solid ${m.riskColor}33`, fontSize: '13px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: '#f0f4ff' }}>
                  📍 {m.location}
                </div>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '16px',
                  background: `${m.riskColor}18`, border: `1px solid ${m.riskColor}44`,
                  color: m.riskColor, fontSize: '12px', fontWeight: 700, marginBottom: '10px',
                }}>
                  Risk: {m.riskScore}/100
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8892a8', textTransform: 'uppercase' }}>pH</div>
                    <div style={{ fontWeight: 600 }}>{m.params.ph}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8892a8', textTransform: 'uppercase' }}>Bulanıklık</div>
                    <div style={{ fontWeight: 600 }}>{m.params.turbidity} NTU</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8892a8', textTransform: 'uppercase' }}>Çöz. O₂</div>
                    <div style={{ fontWeight: 600 }}>{m.params.dissolvedO2} mg/L</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8892a8', textTransform: 'uppercase' }}>Sıcaklık</div>
                    <div style={{ fontWeight: 600 }}>{m.params.temperature}°C</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#555f75', marginTop: '8px' }}>
                  📅 Son ölçüm: {m.lastMeasurement}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
