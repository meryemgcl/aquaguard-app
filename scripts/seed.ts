import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seed() {
  await import('../lib/local-db');
  console.log('Yerel SQLite şeması hazırlandı; ortam değişkenleri tanımlıysa süper yönetici seed edildi.');
}

seed().catch((error: unknown) => {
  console.error('Yerel veritabanı hazırlanamadı:', error);
  process.exitCode = 1;
});
