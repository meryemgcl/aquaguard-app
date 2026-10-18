import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { Module } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

async function run(): Promise<void> {
  const directory = path.join(os.tmpdir(), `aquaguard-media-${process.pid}`);
  process.env.AQUAGUARD_DB_PATH = path.join(directory, 'test.db');
  process.env.AQUAGUARD_UPLOAD_DIR = path.join(directory, 'uploads');
  process.env.JWT_SECRET = 'media-test-secret-that-is-long-enough-123456';
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id: string): unknown {
    return id === 'server-only' ? {} : originalRequire.call(this, id);
  };

  let closeDatabase: (() => void) | undefined;
  try {
    const [{ default: database }, storage, kanban, reportsRoute, mediaRoute] = await Promise.all([
      import('../lib/local-db'),
      import('../lib/media-storage'),
      import('../lib/kanban'),
      import('../app/api/reports/route'),
      import('../app/api/media/[filename]/route'),
    ]);
    closeDatabase = () => database.close();
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const badMime = 'data:image/jpeg;base64,iVBORw0KGgo=';
    assert.throws(() => storage.decodeImageDataUrl(badMime), /MIME türü eşleşmiyor/);
    const oversized = `data:image/png;base64,${Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(5 * 1024 * 1024),
    ]).toString('base64')}`;
    assert.throws(() => storage.decodeImageDataUrl(oversized), /5 MB sınırını aşıyor/);
    assert.equal(storage.isSafeMediaFilename('../secret.png'), false);

    const post = await reportsRoute.POST(new NextRequest('http://localhost/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'token=forged-session-identity',
      },
      body: JSON.stringify({
        privacyLevel: 'anonim',
        category: 'balık ölümü',
        description: 'Nehir kıyısında çok sayıda balık ölüsü görüldü.',
        addressText: 'Kuzey kıyısı',
        province: 'İzmir',
        district: 'Foça',
        coordinates: { lat: 39, lng: 32 },
        photos: [png],
      }),
    }));
    assert.equal(post.status, 201);
    const result = await post.json() as { trackingCode: string };
    assert.match(result.trackingCode, /^AG-\d{4}-[A-F0-9]{32}$/);

    const card = database.prepare(
      'SELECT id FROM reports WHERE tracking_code = ?',
    ).get(result.trackingCode) as { id: string };
    database.prepare("UPDATE reports SET column_name = 'yayinlandi' WHERE id = ?").run(card.id);
    const photoUrl = kanban.getCardPhotos(card.id)?.[0];
    assert.ok(photoUrl);
    const filename = photoUrl.split('/').at(-1)!;
    database.prepare("UPDATE reports SET column_name = 'yeni' WHERE id = ?").run(card.id);
    const privateResponse = await mediaRoute.GET(
      new NextRequest(`http://localhost${photoUrl}`),
      { params: Promise.resolve({ filename }) },
    );
    assert.equal(privateResponse.status, 401, 'unpublished evidence requires staff authorization');
    database.prepare("UPDATE reports SET column_name = 'yayinlandi' WHERE id = ?").run(card.id);
    const response = await mediaRoute.GET(
      new NextRequest(`http://localhost${photoUrl}`),
      { params: Promise.resolve({ filename }) },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'image/png');
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const traversal = await mediaRoute.GET(
      new NextRequest('http://localhost/api/media/..%2Fsecret.png'),
      { params: Promise.resolve({ filename: '../secret.png' }) },
    );
    assert.equal(traversal.status, 404);
    const missing = await mediaRoute.GET(
      new NextRequest('http://localhost/api/media/inc-00000000-0000-0000-0000-000000000000-00000000.png'),
      { params: Promise.resolve({ filename: 'inc-00000000-0000-0000-0000-000000000000-00000000.png' }) },
    );
    assert.equal(missing.status, 404);

    const anonymous = database.prepare(`
      SELECT privacy_level, reporter_name, reporter_email, reporter_phone,
        reporter_contact_encrypted, creator_email, media_metadata_json
      FROM reports WHERE id = ?
    `).get(card.id) as {
      privacy_level: string;
      reporter_name: string;
      reporter_email: string | null;
      reporter_phone: string | null;
      reporter_contact_encrypted: string | null;
      creator_email: string;
      media_metadata_json: string;
    };
    assert.equal(anonymous.privacy_level, 'anonim');
    assert.equal(anonymous.reporter_name, 'Gizli İhbarcı');
    assert.equal(anonymous.reporter_email, null);
    assert.equal(anonymous.reporter_phone, null);
    assert.equal(anonymous.reporter_contact_encrypted, null);
    assert.equal(anonymous.creator_email, '');
    assert.ok(!anonymous.media_metadata_json.includes('data:image'));
    assert.ok(!JSON.stringify(anonymous).includes('token'));

    const hiddenPost = await reportsRoute.POST(new NextRequest('http://localhost/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privacyLevel: 'gizli_iletisim',
        reporterName: 'Gizli Kaynak',
        contact: 'source@example.test',
        category: 'evsel atık',
        description: 'Dere kenarına atık su deşarj edildiği gözlemlendi.',
        addressText: 'Dere çıkışı',
        province: 'İzmir',
        district: 'Foça',
        coordinates: { lat: 39, lng: 32 },
        photos: [png],
      }),
    }));
    assert.equal(hiddenPost.status, 201);
    const hiddenResult = await hiddenPost.json() as { trackingCode: string };
    const hiddenId = database.prepare(
      'SELECT id FROM reports WHERE tracking_code = ?',
    ).get(hiddenResult.trackingCode) as { id: string };
    const hiddenStored = database.prepare(`
      SELECT reporter_name, reporter_email, reporter_phone, reporter_contact_encrypted, creator_email
      FROM reports WHERE id = ?
    `).get(hiddenId.id) as {
      reporter_name: string;
      reporter_email: string | null;
      reporter_phone: string | null;
      reporter_contact_encrypted: string | null;
      creator_email: string;
    };
    assert.equal(hiddenStored.reporter_name, 'Gizli İhbarcı');
    assert.equal(hiddenStored.reporter_email, null);
    assert.equal(hiddenStored.reporter_phone, null);
    assert.equal(hiddenStored.creator_email, '');
    assert.ok(hiddenStored.reporter_contact_encrypted);
    assert.ok(!hiddenStored.reporter_contact_encrypted.includes('source@example.test'));
    assert.deepEqual(kanban.getReporterContact(hiddenId.id), {
      privacyLevel: 'gizli_iletisim',
      reporterName: 'Gizli Kaynak',
      contact: 'source@example.test',
    });

    database.exec('ALTER TABLE reports ADD COLUMN photos_json TEXT NOT NULL DEFAULT \'[]\'');
    database.prepare(`
      UPDATE reports SET photos_json = ?, media_metadata_json = '[]',
        privacy_level = 'acik', reporter_name = 'Legacy source',
        reporter_email = 'legacy@example.test', reporter_phone = NULL,
        reporter_contact_encrypted = NULL
      WHERE id = ?
    `).run(JSON.stringify([png]), hiddenId.id);
    closeDatabase();
    closeDatabase = undefined;
    const migration = spawnSync(process.execPath, [
      path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.join(process.cwd(), 'scripts', 'migrate-media-to-disk.ts'),
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        AQUAGUARD_DB_PATH: path.join(directory, 'test.db'),
        AQUAGUARD_UPLOAD_DIR: path.join(directory, 'uploads'),
        JWT_SECRET: 'migration-test-secret-that-is-long-enough-1234',
      },
    });
    assert.equal(migration.status, 0, migration.stderr || migration.stdout);
    const migratedDatabase = new Database(path.join(directory, 'test.db'));
    try {
      const migrated = migratedDatabase.prepare(`
        SELECT media_metadata_json, reporter_email, reporter_phone, reporter_contact_encrypted
        FROM reports WHERE id = ?
      `).get(hiddenId.id) as {
        media_metadata_json: string;
        reporter_email: string | null;
        reporter_phone: string | null;
        reporter_contact_encrypted: string | null;
      };
      const migratedMetadata = JSON.parse(migrated.media_metadata_json) as Array<{ filename: string }>;
      assert.equal(migratedMetadata.length, 1);
      assert.ok(fs.existsSync(path.join(directory, 'uploads', migratedMetadata[0].filename)));
      assert.equal(migrated.reporter_email, null, 'migration clears legacy plaintext contact');
      assert.equal(migrated.reporter_phone, null);
      assert.ok(migrated.reporter_contact_encrypted);
      assert.ok(!(migratedDatabase.prepare('PRAGMA table_info(reports)').all() as { name: string }[])
        .some(column => column.name === 'photos_json'));
    } finally {
      migratedDatabase.close();
    }

    console.log('Local media write, streaming access, migration, privacy, and path traversal tests passed.');
  } finally {
    closeDatabase?.();
    Module.prototype.require = originalRequire;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

void run();
