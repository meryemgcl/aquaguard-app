import { createRequire } from 'node:module';
import path from 'node:path';
import dotenv from 'dotenv';
import type { MediaMetadata } from '../lib/media-storage';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const moduleRequire = createRequire(import.meta.url);
const Module = moduleRequire('node:module') as typeof import('node:module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string): unknown {
  return id === 'server-only' ? {} : originalRequire.call(this, id);
};

async function main(): Promise<void> {
  const [{ default: database }, { decodeImageDataUrl, removeMediaFiles, saveImageDataUrl }, { encryptReporterContact }] =
    await Promise.all([
      import('../lib/local-db'),
      import('../lib/media-storage'),
      import('../lib/reporter-contact'),
    ]);
  const columns = new Set(
    (database.prepare('PRAGMA table_info(reports)').all() as { name: string }[]).map(column => column.name),
  );
  if (!columns.has('photos_json')) {
    console.log('Media migration not needed: legacy photos_json column is absent.');
    database.close();
    return;
  }

  const rows = database.prepare(`
    SELECT id, photos_json, media_metadata_json, privacy_level, reporter_name,
      reporter_email, reporter_phone, reporter_contact_encrypted
    FROM reports
  `).all() as Array<{
    id: string;
    photos_json: string;
    media_metadata_json: string;
    privacy_level: string;
    reporter_name: string;
    reporter_email: string | null;
    reporter_phone: string | null;
    reporter_contact_encrypted: string | null;
  }>;
  const hasEncryptedContact = columns.has('reporter_contact_encrypted');
  const hasReporterName = columns.has('reporter_name');
  const migratedMedia = database.prepare(`
    UPDATE reports SET media_metadata_json = ?, photos_json = '[]'
    WHERE id = ?
  `);
  const migrateRecord = database.transaction((id: string, metadata: MediaMetadata[], encrypted: string | null) => {
    if (hasEncryptedContact && encrypted) {
      database.prepare(`
        UPDATE reports
        SET media_metadata_json = ?, photos_json = '[]',
            reporter_contact_encrypted = ?, reporter_email = NULL, reporter_phone = NULL
        WHERE id = ?
      `).run(JSON.stringify(metadata), encrypted, id);
      return;
    }
    migratedMedia.run(JSON.stringify(metadata), id);
  });

  let migratedCount = 0;
  try {
    for (const row of rows) {
      const legacyPhotos: unknown = JSON.parse(row.photos_json);
      if (!Array.isArray(legacyPhotos) || !legacyPhotos.every(photo => typeof photo === 'string')) {
        throw new Error(`Rapor ${row.id} içindeki eski fotoğraf verisi geçersiz; kayıt değiştirilmedi.`);
      }
      const legacyMetadata: unknown = JSON.parse(row.media_metadata_json || '[]');
      if (!Array.isArray(legacyMetadata)) {
        throw new Error(`Rapor ${row.id} içindeki medya üst verisi geçersiz; kayıt değiştirilmedi.`);
      }

      const saved: MediaMetadata[] = [];
      try {
        for (const photo of legacyPhotos) {
          decodeImageDataUrl(photo);
          saved.push(saveImageDataUrl(row.id, photo));
        }
        const metadata = [...legacyMetadata as MediaMetadata[], ...saved];
        let encrypted = row.reporter_contact_encrypted;
        if (!encrypted && (row.reporter_email || row.reporter_phone)) {
          const name = hasReporterName ? row.reporter_name : 'İhbarcı';
          const contact = row.reporter_email ?? row.reporter_phone ?? '';
          encrypted = encryptReporterContact({ name, contact });
        }
        migrateRecord(row.id, metadata, encrypted);
        migratedCount += saved.length;
      } catch (error) {
        removeMediaFiles(saved);
        throw error;
      }
    }

    database.exec('ALTER TABLE reports DROP COLUMN photos_json');
    database.close();
    console.log(`Media migration complete. ${migratedCount} image(s) moved to local disk.`);
  } catch (error) {
    database.close();
    throw error;
  }
}

void main().catch(error => {
  console.error('Media migration stopped. Completed records remain migrated; unprocessed records retain their legacy data:', error);
  process.exitCode = 1;
}).finally(() => {
  Module.prototype.require = originalRequire;
});
