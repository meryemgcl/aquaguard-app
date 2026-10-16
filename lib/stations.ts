import 'server-only';

import { randomUUID } from 'node:crypto';
import database from '@/lib/local-db';

export interface Station {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

interface StationRow {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

function mapStation(row: StationRow): Station {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getStations(): Station[] {
  return (database.prepare(`
    SELECT id, name, location, latitude, longitude, created_at, updated_at
    FROM stations ORDER BY name
  `).all() as StationRow[]).map(mapStation);
}

export function createStation(input: Omit<Station, 'id' | 'createdAt' | 'updatedAt'>): Station {
  const now = new Date().toISOString();
  const station: Station = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  database.prepare(`
    INSERT INTO stations (
      id, name, location, latitude, longitude, measurements_json, measured_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    station.id,
    station.name,
    station.location,
    station.latitude,
    station.longitude,
    '{}',
    null,
    station.createdAt,
    station.updatedAt,
  );
  return station;
}
