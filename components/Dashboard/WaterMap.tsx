'use client';

import { useState } from 'react';
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
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite'>('dark');

  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  return (
    <div className={styles.mapWrapper} style={{ height, position: 'relative' }}>
      
      {/* Map Style Controls */}
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 400,
        display: 'flex', gap: '5px', background: 'var(--bg-card)', padding: '5px',
        borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
      }}>
        <button 
          onClick={() => setMapStyle('dark')}
          style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                   background: mapStyle === 'dark' ? 'var(--accent)' : 'transparent',
                   color: mapStyle === 'dark' ? 'white' : 'var(--text-primary)', border: 'none' }}
        >Koyu</button>
        <button 
          onClick={() => setMapStyle('light')}
          style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                   background: mapStyle === 'light' ? 'var(--accent)' : 'transparent',
                   color: mapStyle === 'light' ? 'white' : 'var(--text-primary)', border: 'none' }}
        >Açık</button>
        <button 
          onClick={() => setMapStyle('satellite')}
          style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                   background: mapStyle === 'satellite' ? 'var(--accent)' : 'transparent',
                   color: mapStyle === 'satellite' ? 'white' : 'var(--text-primary)', border: 'none' }}
        >Uydu (3D)</button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer url={tileUrls[mapStyle]} />
        {markers.map(m => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.riskScore > 70 ? 14 : m.riskScore > 40 ? 11 : 8}
            pathOptions={{
              color: m.riskColor,
              fillColor: m.riskColor,
              fillOpacity: mapStyle === 'satellite' ? 0.6 : 0.35,
              weight: 2,
              opacity: 1,
            }}
          >
            <Popup>
              <div style={{
                background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '10px',
                padding: '14px 16px', minWidth: '220px', fontFamily: 'Inter, sans-serif',
                border: `1px solid ${m.riskColor}33`, fontSize: '13px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
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
                  <div style={{ background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>pH</div>
                    <div style={{ fontWeight: 600 }}>{m.params.ph}</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bulanıklık</div>
                    <div style={{ fontWeight: 600 }}>{m.params.turbidity} NTU</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Çöz. O₂</div>
                    <div style={{ fontWeight: 600 }}>{m.params.dissolvedO2} mg/L</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sıcaklık</div>
                    <div style={{ fontWeight: 600 }}>{m.params.temperature}°C</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
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
