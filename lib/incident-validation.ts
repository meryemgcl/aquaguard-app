import { z } from 'zod';

export const incidentPhotoSchema = z.string()
  .max(7_000_000, 'Her görsel 5 MB sınırını aşamaz.')
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'Yalnızca JPG, PNG veya WebP görsel ekleyin.');

const emailSchema = z.string().email();
const phoneSchema = /^\+?[0-9\s().-]{8,20}$/;

export const incidentSubmissionSchema = z.object({
  privacyLevel: z.enum(['anonim', 'gizli_iletisim', 'acik']),
  reporterName: z.string().trim().max(120).optional(),
  contact: z.string().trim().max(254).optional(),
  category: z.enum(['endüstriyel atık', 'evsel atık', 'balık ölümü', 'renk/koku değişimi']),
  description: z.string().trim().min(10, 'Açıklama en az 10 karakter olmalıdır.').max(2500, 'Açıklama 2500 karakteri aşamaz.'),
  addressText: z.string().trim().min(3, 'Konum için kısa bir adres veya yer tarifi yazın.').max(240),
  province: z.string().trim().min(2, 'İl bilgisini girin.').max(80),
  district: z.string().trim().min(2, 'İlçe bilgisini girin.').max(80),
  coordinates: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }),
  photos: z.array(incidentPhotoSchema).min(1, 'En az bir fotoğraf ekleyin.').max(4, 'En fazla 4 fotoğraf ekleyebilirsiniz.')
    .refine(photos => photos.reduce((sum, photo) => sum + photo.length, 0) <= 28_000_000, 'Fotoğrafların toplam boyutu 20 MB sınırını aşamaz.'),
}).superRefine((value, context) => {
  const contact = value.contact?.trim() ?? '';
  const name = value.reporterName?.trim() ?? '';
  if (value.privacyLevel === 'anonim') {
    if (contact || name) {
      context.addIssue({
        code: 'custom',
        path: ['contact'],
        message: 'Tam anonim ihbarda ad veya iletişim bilgisi gönderilemez.',
      });
    }
    return;
  }
  if (name.length < 2) {
    context.addIssue({ code: 'custom', path: ['reporterName'], message: 'Adınızı veya bildirim adını girin.' });
  }
  if (!contact || !(emailSchema.safeParse(contact).success || phoneSchema.test(contact))) {
    context.addIssue({
      code: 'custom',
      path: ['contact'],
      message: 'Geri dönüş için geçerli bir e-posta adresi veya telefon girin.',
    });
  }
});

export const trackingCodeSchema = z.string()
  .trim()
  .toUpperCase()
  .regex(/^AG-\d{4}-(?:[A-Z0-9]{5}|[A-F0-9]{32})$/, 'Takip kodu biçimi geçersiz.');

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
