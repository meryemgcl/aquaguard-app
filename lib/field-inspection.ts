import { z } from 'zod';
import { incidentPhotoSchema } from './incident-validation';
import type { FieldInspectionInput } from './kanban';

export const fieldInspectionSchema = z.object({
  incidentId: z.string().uuid(),
  verdict: z.enum(['confirmed', 'not_confirmed']),
  note: z.string().trim().min(10, 'Saha gözlemi en az 10 karakter olmalıdır.').max(3000),
  measurements: z.object({
    ph: z.number().finite().min(0).max(14).optional(),
    dissolvedO2: z.number().finite().min(0).max(100).optional(),
    temperature: z.number().finite().min(-5).max(100).optional(),
    conductivity: z.number().finite().min(0).max(1_000_000).optional(),
    turbidity: z.number().finite().min(0).max(100_000).optional(),
  }).strict(),
  photos: z.array(incidentPhotoSchema).max(4, 'En fazla 4 saha fotoğrafı ekleyebilirsiniz.')
    .refine(photos => photos.reduce((sum, photo) => sum + photo.length, 0) <= 8_400_000,
      'Saha fotoğraflarının toplam boyutu 6 MB sınırını aşamaz.'),
  submittedAt: z.string().datetime({ offset: true }),
}).strict();

export type FieldInspectionPayload = z.infer<typeof fieldInspectionSchema>;

export function validateFieldInspection(value: unknown): FieldInspectionInput {
  return fieldInspectionSchema.parse(value);
}
