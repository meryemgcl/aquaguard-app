import type { FieldInspectionPayload } from './field-inspection';
import type { FieldSyncResult, FieldSyncServerIncident } from './field-inspection';

const INCIDENT_CACHE_KEY = 'aquaguard:field-incidents:v1';
const INSPECTION_QUEUE_KEY = 'aquaguard:field-inspection-queue:v1';

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
  version: number;
  cachedAt: string;
}

export interface QueuedFieldInspection {
  queueId: string;
  clientMutationId: string;
  incidentId: string;
  baseVersion: number;
  verdict: FieldInspectionPayload['verdict'];
  notes: string;
  measurements: FieldInspectionPayload['measurements'];
  fieldPhotos: string[];
  timestamp: string;
  resolution?: FieldInspectionPayload['resolution'];
  syncStatus: 'Senkronizasyon Bekliyor' | 'Çakışma İncelemesi Gerekli' | 'Senkronizasyon Reddedildi';
  syncMessage?: string;
  serverIncident?: FieldSyncServerIncident;
}

export function getCachedFieldIncidents(): CachedFieldIncident[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(INCIDENT_CACHE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Çevrimdışı ihbar önbelleği geçersiz.');
  return parsed as CachedFieldIncident[];
}

export function cacheFieldIncident(incident: Omit<CachedFieldIncident, 'cachedAt'>): void {
  if (typeof window === 'undefined') throw new Error('İhbar yalnızca tarayıcıda önbelleğe alınabilir.');
  const cached = getCachedFieldIncidents().filter(item => item.id !== incident.id);
  cached.push({ ...incident, cachedAt: new Date().toISOString() });
  window.localStorage.setItem(INCIDENT_CACHE_KEY, JSON.stringify(cached));
}

export function getOfflineInspectionQueue(): QueuedFieldInspection[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(INSPECTION_QUEUE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Çevrimdışı saha kuyruğu geçersiz.');
  return parsed as QueuedFieldInspection[];
}

function saveQueue(queue: QueuedFieldInspection[]): void {
  if (typeof window === 'undefined') throw new Error('Saha kuyruğu yalnızca tarayıcıda saklanabilir.');
  window.localStorage.setItem(INSPECTION_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueFieldInspection(payload: FieldInspectionPayload): void {
  const queue = getOfflineInspectionQueue();
  if (queue.some(item => item.incidentId === payload.incidentId)) {
    throw new Error('Bu ihbar için zaten senkronizasyon bekleyen bir saha kaydı var.');
  }
  queue.push({
    ...payload,
    queueId: payload.clientMutationId,
    syncStatus: 'Senkronizasyon Bekliyor',
  });
  saveQueue(queue);
}

export function replaceQueuedFieldInspection(
  clientMutationId: string,
  payload: FieldInspectionPayload,
): void {
  const queue = getOfflineInspectionQueue();
  const index = queue.findIndex(item => item.clientMutationId === clientMutationId);
  if (index < 0) throw new Error('Çözülecek saha kaydı artık cihaz kuyruğunda bulunmuyor.');
  queue[index] = {
    ...payload,
    queueId: payload.clientMutationId,
    syncStatus: 'Senkronizasyon Bekliyor',
  };
  saveQueue(queue);
}

export function applyFieldSyncResults(
  queue: QueuedFieldInspection[],
  results: FieldSyncResult[],
): QueuedFieldInspection[] {
  const byMutationId = new Map(results.map(result => [result.clientMutationId, result]));
  return queue.flatMap(item => {
    const result = byMutationId.get(item.clientMutationId);
    if (!result) return [item];
    if (result.status === 'SUCCESS' || result.status === 'ALREADY_PROCESSED') return [];
    if (result.status === 'CONFLICT') {
      return [{
        ...item,
        syncStatus: 'Çakışma İncelemesi Gerekli' as const,
        syncMessage: result.message,
        ...(result.serverIncident ? { serverIncident: result.serverIncident } : {}),
      }];
    }
    return [{
      ...item,
      syncStatus: 'Senkronizasyon Reddedildi' as const,
      syncMessage: result.message,
    }];
  });
}

function toSyncPayload(item: QueuedFieldInspection): FieldInspectionPayload {
  return {
    clientMutationId: item.clientMutationId,
    incidentId: item.incidentId,
    baseVersion: item.baseVersion,
    verdict: item.verdict,
    notes: item.notes,
    measurements: item.measurements,
    fieldPhotos: item.fieldPhotos,
    timestamp: item.timestamp,
    ...(item.resolution ? { resolution: item.resolution } : {}),
  };
}

export async function synchronizeFieldQueue(): Promise<{
  synced: number;
  conflicts: number;
  rejected: number;
}> {
  const queue = getOfflineInspectionQueue();
  if (!queue.length) return { synced: 0, conflicts: 0, rejected: 0 };
  const response = await fetch('/api/saha/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: queue.map(toSyncPayload) }),
  });
  const body: unknown = await response.json();
  if (!response.ok || typeof body !== 'object' || body === null ||
      !('results' in body) || !Array.isArray(body.results)) {
    const detail = typeof body === 'object' && body !== null && 'error' in body &&
      typeof body.error === 'string' ? body.error : 'Saha kayıtları senkronize edilemedi.';
    throw new Error(detail);
  }
  const results = body.results as FieldSyncResult[];
  saveQueue(applyFieldSyncResults(queue, results));
  return {
    synced: results.filter(result => result.status === 'SUCCESS' || result.status === 'ALREADY_PROCESSED').length,
    conflicts: results.filter(result => result.status === 'CONFLICT').length,
    rejected: results.filter(result => result.status === 'REJECTED').length,
  };
}
