'use client';

import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import type { Coordinates } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

export default function IncidentLocationPreview({ coordinates }: { coordinates: Coordinates }) {
  return (
    <MapContainer
      center={[coordinates.lat, coordinates.lng]}
      zoom={14}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      style={{ height: 180, width: '100%', borderRadius: 8 }}
      aria-label="İhbarın bildirildiği konum"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[coordinates.lat, coordinates.lng]}
        radius={9}
        pathOptions={{ color: '#fff', weight: 3, fillColor: '#e5484d', fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
