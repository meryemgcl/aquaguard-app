import { z } from 'zod';
import { incidentPhotoSchema } from './incident-validation';
export const fieldInspectionSchema = z.object({
  clientMutationId: z.string().uuid(),
  incidentId: z.string().uuid(),
  baseVersion: z.number().int().positive(),
  verdict: z.enum(['confirmed', 'not_confirmed']),
  notes: z.string().trim().min(10, 'Saha gözlemi en az 10 karakter olmalıdır.').max(3000),
  measurements: z.object({
    ph: z.number().finite().min(0).max(14).optional(),
    dissolvedO2: z.number().finite().min(0).max(100).optional(),
    temperature: z.number().finite().min(-5).max(100).optional(),
    conductivity: z.number().finite().min(0).max(1_000_000).optional(),
    turbidity: z.number().finite().min(0).max(100_000).optional(),
  }).strict(),
  fieldPhotos: z.array(incidentPhotoSchema).max(4, 'En fazla 4 saha fotoğrafı ekleyebilirsiniz.')
    .refine(photos => photos.reduce((sum, photo) => sum + photo.length, 0) <= 20_000_000,
      'Saha fotoğraflarının toplam boyutu 20 MB sınırını aşamaz.'),
  timestamp: z.string().datetime({ offset: true }),
  resolution: z.enum(['FORCE_OVERWRITE', 'DISCARDED']).optional(),
}).strict();

export type FieldInspectionPayload = z.infer<typeof fieldInspectionSchema>;

export interface FieldSyncServerIncident {
  id: string;
  trackingCode: string | null;
  title: string;
  status: string;
  column: string;
  resolution: string | null;
  version: number;
  updatedAt: string;
  measurements?: FieldInspectionPayload['measurements'];
  managerNotes: string | null;
  expertNotes: string | null;
}

export interface FieldSyncResult {
  clientMutationId: string;
  incidentId: string;
  status: 'SUCCESS' | 'CONFLICT' | 'REJECTED' | 'ALREADY_PROCESSED';
  message: string;
  serverIncident?: FieldSyncServerIncident;
}
