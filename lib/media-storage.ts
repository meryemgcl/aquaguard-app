import 'server-only';

import { randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export interface MediaMetadata {
  id: string;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
  createdAt: string;
}

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FILENAME_PATTERN = new RegExp(`^inc-${UUID_PATTERN}-${UUID_PATTERN}\\.(?:jpg|png|webp)$`);

export function getUploadDirectory(): string {
  const configuredPath = process.env.AQUAGUARD_UPLOAD_DIR;
  return configuredPath
    ? path.resolve(/*turbopackIgnore: true*/ configuredPath)
    : path.join(process.cwd(), 'data', 'uploads');
}

function detectMimeType(buffer: Buffer): MediaMetadata['mimeType'] | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export function decodeImageDataUrl(dataUrl: string): {
  bytes: Buffer;
  mimeType: MediaMetadata['mimeType'];
} {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('Yalnızca geçerli JPEG, PNG veya WebP görseli yükleyebilirsiniz.');

  const declaredMimeType = match[1] as MediaMetadata['mimeType'];
  const encoded = match[2];
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_MEDIA_BYTES ||
      bytes.toString('base64') !== encoded) {
    throw new Error('Görsel boş, bozuk veya 5 MB sınırını aşıyor.');
  }

  const detectedMimeType = detectMimeType(bytes);
  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw new Error('Görselin gerçek dosya türü ile bildirilen MIME türü eşleşmiyor.');
  }
  return { bytes, mimeType: detectedMimeType };
}

export function saveImageDataUrl(
  incidentId: string,
  dataUrl: string,
): MediaMetadata {
  const { bytes, mimeType } = decodeImageDataUrl(dataUrl);
  const directory = getUploadDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = `inc-${incidentId}-${randomUUID()}.${MIME_EXTENSIONS[mimeType]}`;
  const filePath = path.join(directory, filename);
  const handle = openSync(filePath, 'wx', 0o600);
  try {
    writeFileSync(handle, bytes);
  } catch (writeError) {
    let cleanupError: unknown;
    try {
      closeSync(handle);
    } catch (error) {
      cleanupError = error;
    }
    try {
      unlinkSync(filePath);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        cleanupError ??= error;
      }
    }
    if (cleanupError) {
      throw new AggregateError([writeError, cleanupError], 'Medya yazımı başarısız oldu ve geçici dosya temizlenemedi.');
    }
    throw writeError;
  }
  closeSync(handle);

  return {
    id: randomUUID(),
    filename,
    mimeType,
    size: bytes.length,
    createdAt: new Date().toISOString(),
  };
}

export function isSafeMediaFilename(filename: string): boolean {
  return FILENAME_PATTERN.test(filename) && path.basename(filename) === filename;
}

export function getMediaFilePath(filename: string): string {
  if (!isSafeMediaFilename(filename)) throw new Error('Geçersiz medya dosya adı.');
  const directory = getUploadDirectory();
  const filePath = path.resolve(directory, filename);
  if (path.dirname(filePath) !== directory) throw new Error('Medya dosya yolu geçersiz.');
  return filePath;
}

export function removeMediaFiles(media: readonly MediaMetadata[]): void {
  for (const item of media) {
    try {
      unlinkSync(getMediaFilePath(item.filename));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
  }
}

export function mediaUrl(filename: string): string {
  if (!isSafeMediaFilename(filename)) throw new Error('Geçersiz medya dosya adı.');
  return `/api/media/${encodeURIComponent(filename)}`;
}
