import { z } from 'zod';

export const incidentPhotoSchema = z.string()
  .max(2_800_000, 'Her görsel 2 MB sınırını aşamaz.')
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'Yalnızca JPG, PNG veya WebP görsel ekleyin.');

const emailSchema = z.string().email();
const phoneSchema = /^\+?[0-9\s().-]{8,20}$/;

export const incidentSubmissionSchema = z.object({
  category: z.enum(['endüstriyel atık', 'evsel atık', 'balık ölümü', 'renk/koku değişimi']),
  description: z.string().trim().min(10, 'Açıklama en az 10 karakter olmalıdır.').max(2500, 'Açıklama 2500 karakteri aşamaz.'),
  addressText: z.string().trim().min(3, 'Konum için kısa bir adres veya yer tarifi yazın.').max(240),
  province: z.string().trim().min(2, 'İl bilgisini girin.').max(80),
  district: z.string().trim().min(2, 'İlçe bilgisini girin.').max(80),
  contact: z.string().trim().min(1, 'E-posta veya telefon bilgisi gereklidir.').max(254)
    .refine(value => emailSchema.safeParse(value).success || phoneSchema.test(value), 'Geçerli bir e-posta adresi veya telefon numarası girin.'),
  coordinates: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }),
  photos: z.array(incidentPhotoSchema).min(1, 'En az bir fotoğraf ekleyin.').max(4, 'En fazla 4 fotoğraf ekleyebilirsiniz.')
    .refine(photos => photos.reduce((sum, photo) => sum + photo.length, 0) <= 8_400_000, 'Fotoğrafların toplam boyutu 6 MB sınırını aşamaz.'),
});

export const trackingCodeSchema = z.string()
  .trim()
  .toUpperCase()
  .regex(/^AG-\d{4}-[A-Z0-9]{5}$/, 'Takip kodu AG-2026-ABCDE biçiminde olmalıdır.');

export const publicIncidentTrackingSchema = z.object({
  trackingCode: trackingCodeSchema,
  title: z.string(),
  category: z.string(),
  addressText: z.string(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  reportedAt: z.string(),
  updatedAt: z.string(),
  status: z.enum([
    'yeni_ihbar',
    'uzman_incelemesinde',
    'dogrulandi',
    'yonetici_onayinda',
    'yayinda',
    'reddedildi',
    'gecersiz_ihbar',
    'kapatildi',
  ]),
  statusLabel: z.string(),
  timeline: z.array(z.object({
    label: z.string(),
    completed: z.boolean(),
    timestamp: z.string().nullable(),
  })),
  officialNote: z.string().nullable(),
});

export type IncidentSubmission = z.infer<typeof incidentSubmissionSchema>;
export type PublicIncidentTrackingData = z.infer<typeof publicIncidentTrackingSchema>;
