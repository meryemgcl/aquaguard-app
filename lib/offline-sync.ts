'use client';

import type { FieldInspectionPayload } from './field-inspection';

const QUEUE_KEY = 'aquaguard:field-inspection-queue:v1';
const INCIDENT_CACHE_KEY = 'aquaguard:field-incident-cache:v1';

export interface CachedFieldIncident {
  id: string;
  trackingCode: string | null;
  title: string;
  description: string;
  coordinates: { lat: number; lng: number } | null;
  location: string;
  province: string | null;
  district: string | null;
  category: string;
  column: string;
  photos: string[];
  createdAt: string;
  cachedAt: string;
}

export interface QueuedFieldInspection extends FieldInspectionPayload {
  queueId: string;
  queuedAt: string;
  syncStatus: 'Senkronizasyon Bekliyor';
}

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const value = window.localStorage.getItem(key);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error(`Yerel saha verisi geçersiz: ${key}`);
    return parsed as T[];
  } catch (error) {
    console.error('Tarayıcıdaki saha verisi okunamadı:', error);
    throw new Error('Cihazdaki çevrimdışı saha kayıtları okunamadı; veri kaybını önlemek için depolama alanını temizlemeyin.');
  }
}

function writeArray<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') throw new Error('Çevrimdışı kayıt için tarayıcı depolaması kullanılamıyor.');
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Cihazdaki saha verisi kaydedilemedi:', error);
    throw new Error('Cihaz depolama alanı dolu veya kullanılamıyor. Fotoğrafları küçültüp tekrar deneyin.');
  }
}

export function getCachedFieldIncidents(): CachedFieldIncident[] {
  return readArray<CachedFieldIncident>(INCIDENT_CACHE_KEY);
}

export function cacheFieldIncident(incident: Omit<CachedFieldIncident, 'cachedAt'>): void {
  const cached = getCachedFieldIncidents();
  const value: CachedFieldIncident = { ...incident, cachedAt: new Date().toISOString() };
  writeArray(INCIDENT_CACHE_KEY, [value, ...cached.filter(item => item.id !== incident.id)]);
}

export function getOfflineInspectionQueue(): QueuedFieldInspection[] {
  return readArray<QueuedFieldInspection>(QUEUE_KEY);
}

export function enqueueFieldInspection(payload: FieldInspectionPayload): QueuedFieldInspection {
  const queue = getOfflineInspectionQueue();
  const existing = queue.find(item => item.incidentId === payload.incidentId);
  if (existing) throw new Error('Bu ihbar için cihazda zaten senkronizasyon bekleyen bir saha kaydı var.');
  const item: QueuedFieldInspection = {
    ...payload,
    queueId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    syncStatus: 'Senkronizasyon Bekliyor',
  };
  writeArray(QUEUE_KEY, [...queue, item]);
  return item;
}

export async function synchronizeFieldQueue(): Promise<{ synced: number; pending: number }> {
  const queue = getOfflineInspectionQueue();
  if (!queue.length) return { synced: 0, pending: 0 };
  if (!navigator.onLine) throw new Error('Cihaz çevrimdışı; saha kayıtları cihazda beklemeye devam ediyor.');

  const payloads = queue.map(item => {
    const { queueId, queuedAt, syncStatus, ...payload } = item;
    void queueId;
    void queuedAt;
    void syncStatus;
    return payload;
  });

  const response = await fetch('/api/saha/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspections: payloads }),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result &&
      typeof result.error === 'string' ? result.error : 'Saha kayıtları senkronize edilemedi.';
    throw new Error(message);
  }
  if (typeof result !== 'object' || result === null || !('syncedCount' in result) ||
      typeof result.syncedCount !== 'number' || result.syncedCount !== queue.length) {
    throw new Error('Sunucu tüm saha kayıtlarının eşitlendiğini doğrulamadı; kayıtlar cihazda tutuluyor.');
  }

  const remaining = getOfflineInspectionQueue().filter(item =>
    !queue.some(synced => synced.queueId === item.queueId),
  );
  writeArray(QUEUE_KEY, remaining);
  return { synced: result.syncedCount, pending: remaining.length };
}
