// src/lib/db.ts
import { LowSync, JSONFileSync } from 'lowdb';

type Data = {
  users: import('../lib/types').User[];
  reports: import('../lib/types').Report[];
};

const adapter = new JSONFileSync<Data>('db.json');
const db = new LowSync<Data>(adapter);

// Read data from JSON file, if file doesn't exist create default structure
db.read();
if (!db.data) {
  db.data = { users: [], reports: [] };
  db.write();
}

export default db;
