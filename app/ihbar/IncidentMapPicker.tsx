'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { Coordinates } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

function MapInteractions({
  coordinates,
  onSelect,
}: {
  coordinates: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
}) {
  const map = useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  useEffect(() => {
    if (coordinates) map.setView([coordinates.lat, coordinates.lng], Math.max(map.getZoom(), 13));
  }, [coordinates, map]);

  return coordinates ? (
    <CircleMarker
      center={[coordinates.lat, coordinates.lng]}
      radius={10}
      pathOptions={{ color: '#fff', weight: 3, fillColor: '#e5484d', fillOpacity: 1 }}
    />
  ) : null;
}

export default function IncidentMapPicker({
  coordinates,
  onSelect,
}: {
  coordinates: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
}) {
  return (
    <MapContainer
      center={coordinates ? [coordinates.lat, coordinates.lng] : [39, 35]}
      zoom={coordinates ? 13 : 5}
      scrollWheelZoom
      className="incidentMap"
      aria-label="İhbar konumunu seçmek için harita"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteractions coordinates={coordinates} onSelect={onSelect} />
    </MapContainer>
  );
}
