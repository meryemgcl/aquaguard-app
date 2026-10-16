'use client';

import { useEffect, useRef } from 'react';
import { latLngBounds } from 'leaflet';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { IncidentCluster } from '@/lib/clustering';
import styles from './Radar.module.css';

interface Props {
  clusters: IncidentCluster[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function FitClusters({ clusters }: { clusters: IncidentCluster[] }) {
  const map = useMap();
  const clusterIds = clusters.map(cluster => cluster.id).join('|');
  const lastFittedClusterIds = useRef<string | null>(null);
  useEffect(() => {
    if (lastFittedClusterIds.current === clusterIds) return;
    lastFittedClusterIds.current = clusterIds;
    if (clusters.length > 1) {
      map.fitBounds(latLngBounds(clusters.map(cluster => [cluster.center.lat, cluster.center.lng])), {
        padding: [28, 28],
        maxZoom: 9,
      });
    } else if (clusters.length === 1) {
      map.setView([clusters[0].center.lat, clusters[0].center.lng], 8);
    }
  }, [map, clusterIds, clusters]);
  return null;
}

export default function RadarMap({ clusters, selectedId, onSelect }: Props) {
  const center: [number, number] = clusters.length
    ? [clusters[0].center.lat, clusters[0].center.lng]
    : [39, 35];

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom className={styles.map}>
      <FitClusters clusters={clusters} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {clusters.map(cluster => (
        <Circle
          key={cluster.id}
          center={[cluster.center.lat, cluster.center.lng]}
          radius={Math.max(cluster.radiusMeters, 500)}
          pathOptions={{
            color: cluster.color,
            fillColor: cluster.color,
            fillOpacity: selectedId === cluster.id ? 0.26 : 0.14,
            weight: selectedId === cluster.id ? 4 : 2,
            className: 'radar-cluster-zone',
          }}
          eventHandlers={{ click: () => onSelect(cluster.id) }}
        >
          <Popup>
            <strong>{cluster.label}</strong><br />
            {cluster.incidentCount} ihbar · {cluster.category}<br />
            {cluster.regionLabel}
          </Popup>
        </Circle>
      ))}
      {clusters.flatMap(cluster => cluster.incidents.map(incident => (
        <CircleMarker
          key={`${cluster.id}-${incident.id}`}
          center={[incident.coordinates.lat, incident.coordinates.lng]}
          radius={selectedId === cluster.id ? 8 : 6}
          pathOptions={{
            color: '#fff',
            fillColor: cluster.color,
            fillOpacity: 0.95,
            weight: 2,
          }}
          eventHandlers={{ click: () => onSelect(cluster.id) }}
        >
          <Popup>
            <strong>{incident.trackingCode || incident.title}</strong><br />
            {incident.category} · {new Date(incident.reportedAt).toLocaleString('tr-TR')}
          </Popup>
        </CircleMarker>
      )))}
    </MapContainer>
  );
}
