'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, CircleMarker } from 'react-leaflet';
import useSupercluster from 'use-supercluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { IncidentMapMarker } from '@/lib/incident-map';
import styles from './Dashboard.module.css';

const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const riskColors: Record<string, string> = {
  low: '#2f80ed',
  medium: '#f2c94c',
  high: '#ff6b35',
  critical: '#eb5757',
};

/* ── Fix leaflet default icon ── */
// @ts-expect-error Leaflet internal icon URL property may not exist on types.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  markers: IncidentMapMarker[];
  height?: string;
  zoom?: number;
  center?: [number, number];
}

/* ══════════════════════════════════════════
   ClusterLayer — react-leaflet hook context içinde çalışır
   ══════════════════════════════════════════ */
function ClusterLayer({ markers }: { markers: IncidentMapMarker[] }) {
  const map = useMap();
  const [bounds, setBounds] = useState<[number, number, number, number]>([-90, -180, 90, 180]);
  const [zoom, setZoom] = useState(map.getZoom());

  // Harita hareket/zoom ettikçe güncelle
  map.on('moveend zoomend', () => {
    const b = map.getBounds();
    setBounds([
      b.getSouthWest().lat,
      b.getSouthWest().lng,
      b.getNorthEast().lat,
      b.getNorthEast().lng,
    ]);
    setZoom(map.getZoom());
  });

  // GeoJSON point formatına çevir
  const points = markers.map(m => ({
    type: 'Feature' as const,
    properties: {
      cluster: false,
      markerId: m.id,
      riskColor: m.riskColor,
      riskScore: m.riskScore,
      riskLevel: m.riskLevel,
      location: m.location,
      reportedAt: m.reportedAt,
      params: m.params,
      title: m.title,
      category: m.category,
      status: m.status,
      province: m.province,
      district: m.district,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [m.lng, m.lat],
    },
  }));

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom,
    options: {
      radius: 80,       // px cinsinden küme yarıçapı
      maxZoom: 18,
    },
  });

  return (
    <>
      {clusters.map(cluster => {
        const [lng, lat] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count, riskColor, riskScore, location,
                riskLevel, reportedAt, params, title, category, status, province, district } = cluster.properties;

        /* ── CLUSTER (grup) noktası ── */
        if (isCluster) {
          // Kümedeki en yüksek risk rengini bul
          const leaves = supercluster!.getLeaves(cluster.id as number, Infinity);
          const assessedLevels = leaves
            .map((leaf: { properties: { riskLevel: string } }) => leaf.properties.riskLevel)
            .filter((level: string) => Object.prototype.hasOwnProperty.call(riskOrder, level));
          const highestRisk = assessedLevels.sort((a: string, b: string) => riskOrder[b] - riskOrder[a])[0];
          const clusterColor = highestRisk ? riskColors[highestRisk] : '#8892a8';

          const size = Math.min(20 + (point_count / markers.length) * 40, 56);

          // HTML div icon ile sayı gösteren daire
          const clusterIcon = L.divIcon({
            html: `
              <div style="
                width:${size}px; height:${size}px;
                background: radial-gradient(circle at 35% 35%, ${clusterColor}cc, ${clusterColor}55);
                border: 2.5px solid ${clusterColor};
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: ${size > 40 ? 14 : 12}px;
                font-weight: 800;
                color: #fff;
                box-shadow: 0 0 18px ${clusterColor}77, 0 2px 8px rgba(0,0,0,0.5);
                text-shadow: 0 1px 3px rgba(0,0,0,0.7);
                cursor: pointer;
                transition: transform 0.2s;
              ">${point_count}</div>
            `,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          return (
            <Marker
              key={`cluster-${cluster.id}`}
              position={[lat, lng]}
              icon={clusterIcon}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    supercluster!.getClusterExpansionZoom(cluster.id as number),
                    18
                  );
                  map.flyTo([lat, lng], expansionZoom, { duration: 0.6 });
                },
              }}
            />
          );
        }

        /* ── TEKİL nokta ── */
        const radius = riskLevel === 'critical' ? 12 : riskLevel === 'high' ? 10 : 7;
        return (
          <CircleMarker
            key={`point-${cluster.properties.markerId}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: riskColor,
              fillColor: riskColor,
              fillOpacity: 0.4,
              weight: 2,
              opacity: 1,
            }}
          >
            <Popup>
              <div style={{
                background: '#111827', color: '#f0f4ff', borderRadius: '10px',
                padding: '14px 16px', minWidth: '220px', fontFamily: 'Inter, sans-serif',
                border: `1px solid ${riskColor}44`, fontSize: '13px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  {title || `📍 ${location}`}
                </div>
                <div style={{ fontSize: '11px', color: '#8892a8', marginBottom: '8px' }}>
                  📍 {location}{district && province ? ` · ${district}, ${province}` : ''}
                </div>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '16px',
                  background: `${riskColor}18`, border: `1px solid ${riskColor}44`,
                  color: riskColor, fontSize: '12px', fontWeight: 700, marginBottom: '10px',
                }}>
                  {riskScore === null ? 'Uzman değerlendirmesi bekleniyor' : `${riskLevelLabel(riskLevel)} · ${riskScore}/100`}
                </div>
                <div style={{ fontSize: '11px', marginBottom: '8px' }}>{category} · {statusLabel(status)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { label: 'pH', val: params?.ph ?? 'Ölçüm yok' },
                    { label: 'Bulanıklık', val: params?.turbidity !== undefined ? `${params.turbidity} NTU` : 'Ölçüm yok' },
                    { label: 'Çöz. O₂', val: params?.dissolvedO2 !== undefined ? `${params.dissolvedO2} mg/L` : 'Ölçüm yok' },
                    { label: 'Sıcaklık', val: params?.temperature !== undefined ? `${params.temperature}°C` : 'Ölçüm yok' },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.05)',
                      padding: '6px 8px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '10px', color: '#555f75', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#555f75', marginTop: '8px' }}>
                  📅 Rapor tarihi: {reportedAt}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function riskLevelLabel(level: string): string {
  return ({
    low: 'Düşük risk',
    medium: 'Orta risk',
    high: 'Yüksek risk',
    critical: 'Kritik risk',
  } as Record<string, string>)[level] ?? 'Değerlendirilmedi';
}

function statusLabel(status: string): string {
  return ({
    yeni_ihbar: 'Yeni ihbar',
    uzman_incelemesinde: 'Uzman incelemesinde',
    dogrulandi: 'Doğrulandı',
    yonetici_onayinda: 'Yönetici onayında',
    yayinda: 'Yayında',
    reddedildi: 'Reddedildi',
    gecersiz_ihbar: 'Geçersiz ihbar',
    kapatildi: 'Kapatıldı',
  } as Record<string, string>)[status] ?? status;
}

/* ══════════════════════════════════════════
   Ana WaterMap bileşeni
   ══════════════════════════════════════════ */
export default function WaterMap({ markers, height = '380px', zoom = 6, center = [39.5, 32.5] }: Props) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite'>('dark');

  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  return (
    <div className={styles.mapWrapper} style={{ height, position: 'relative' }}>

      {/* Map Style Controls */}
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 400,
        display: 'flex', gap: '5px', background: 'rgba(17,24,39,0.92)', padding: '5px',
        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}>
        {(['dark', 'light', 'satellite'] as const).map(s => (
          <button key={s}
            onClick={() => setMapStyle(s)}
            style={{
              padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
              background: mapStyle === s ? '#00d4ff' : 'transparent',
              color: mapStyle === s ? '#0a0f1e' : '#8892a8',
              border: 'none', fontWeight: mapStyle === s ? 700 : 400, transition: 'all 0.2s',
            }}>
            {s === 'dark' ? 'Koyu' : s === 'light' ? 'Açık' : 'Uydu'}
          </button>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer url={tileUrls[mapStyle]} />
        <ClusterLayer markers={markers} />
      </MapContainer>
    </div>
  );
}
