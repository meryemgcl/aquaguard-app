/* ============================================================
   AquaGuard — User Store (env-driven real emails)
   ============================================================ */

import { User, SafeUser } from './types';
import { hashPassword } from './auth';

const users: User[] = [];
let initialized = false;

async function seedUsers() {
  if (initialized) return;
  initialized = true;

  // Gerçek e-posta adresleri .env'den okunur
  const defaultUsers: Omit<User, 'passwordHash'>[] = [
    {
      id: '1',
      name: process.env.ADMIN_NAME || 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@aquaguard.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: process.env.UZMAN_NAME || 'Ayşe Yılmaz',
      email: process.env.UZMAN_EMAIL || 'uzman@aquaguard.com',
      role: 'uzman',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: process.env.YONETICI_NAME || 'Mehmet Demir',
      email: process.env.YONETICI_EMAIL || 'yonetici@aquaguard.com',
      role: 'yonetici',
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: process.env.HALK_NAME || 'Halk Kullanıcı',
      email: process.env.HALK_EMAIL || 'halk@aquaguard.com',
      role: 'halk',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const u of defaultUsers) {
    const passwordHash = await hashPassword('123456');
    users.push({ ...u, passwordHash });
  }
}

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
  if (existing) throw new Error('Bu e-posta adresi zaten kayıtlı.');

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
