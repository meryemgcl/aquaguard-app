import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function clearLocalData() {
  if (!process.argv.includes('--confirm')) {
    throw new Error('Veri silmek için komutu --confirm parametresiyle tekrar çalıştırın.');
  }

  const { default: database } = await import('../lib/local-db');
  const clear = database.transaction(() => {
    database.prepare('DELETE FROM reports').run();
    database.prepare('DELETE FROM stations').run();
  });
  clear();
  console.log('Raporlar ve istasyonlar temizlendi. Kullanıcı hesapları korundu.');
}

clearLocalData().catch((error: unknown) => {
  console.error('Yerel veri temizlenemedi:', error);
  process.exitCode = 1;
});
