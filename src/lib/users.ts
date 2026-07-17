/* ============================================================
   AquaGuard — In-Memory User Store (Demo)
   Replace with a real database (PostgreSQL/MongoDB) in production.
   ============================================================ */

import { User, SafeUser } from './types';
import { hashPassword } from './auth';

/* ── In-memory store ── */
const users: User[] = [];
let initialized = false;

/* ── Seed default users ── */
async function seedUsers() {
  if (initialized) return;
  initialized = true;

  const defaultUsers: Omit<User, 'passwordHash'>[] = [
    { id: '1', name: 'Admin User', email: 'admin@aquaguard.com', role: 'admin', createdAt: new Date().toISOString() },
    { id: '2', name: 'Ayşe Yılmaz', email: 'ayse@aquaguard.com', role: 'uzman', createdAt: new Date().toISOString() },
    { id: '3', name: 'Mehmet Demir', email: 'mehmet@aquaguard.com', role: 'yonetici', createdAt: new Date().toISOString() },
    { id: '4', name: 'Halk Kullanıcı', email: 'halk@aquaguard.com', role: 'halk', createdAt: new Date().toISOString() },
  ];

  for (const u of defaultUsers) {
    const passwordHash = await hashPassword('123456');
    users.push({ ...u, passwordHash });
  }
}

/* ── CRUD Operations ── */

export async function findUserByEmail(email: string): Promise<User | undefined> {
  await seedUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  await seedUsers();
  return users.find((u) => u.id === id);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: User['role'];
}): Promise<SafeUser> {
  await seedUsers();

  const existing = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
  if (existing) {
    throw new Error('Bu e-posta adresi zaten kayıtlı.');
  }

  const passwordHash = await hashPassword(data.password);
  const newUser: User = {
    id: String(Date.now()),
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role || 'halk',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  return toSafeUser(newUser);
}

export async function getAllUsers(): Promise<SafeUser[]> {
  await seedUsers();
  return users.map(toSafeUser);
}

/* ── Helpers ── */

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}
